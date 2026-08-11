import type { Codec, MediaInfo, ExportPlan } from '@shared/types'
import { MIN_AUDIO_BITRATE_K, MIN_VIDEO_BITRATE_K, SAFETY } from '@shared/limits'
import { QUALITY_CRF, PRECISE_AUDIO_K, fallbackQualityK, gopFrames } from './quality'
import { measureVideoBitrateK } from './sample'

const DOWNSCALE_OPTIONS = [1080, 720, 480, 360]

/**
 * Rough "looks good enough" video bitrate in kbps for a given height, ~2000k at
 * 1080p and scaled by pixel count. Decides when a smaller resolution would look
 * better than a full res encode.
 */
function minBitrateForHeightK(h: number): number {
    return Math.round(2000 * (h / 1080) ** 2)
}

const AUDIO_OPTIONS = [192, 128, 96, MIN_AUDIO_BITRATE_K]

/** the most of the budget audio may take before it costs the picture too much. */
const AUDIO_BUDGET_SHARE = 0.125

/**
 * Chosen from the budget rather than the target: the same ten megabytes is
 * generous over ten seconds and tight over ten minutes.
 */
function pickAudioBitrateK(budgetTotalK: number): number {
    const affordable = AUDIO_OPTIONS.find((k) => k <= budgetTotalK * AUDIO_BUDGET_SHARE)
    return affordable ?? AUDIO_OPTIONS[AUDIO_OPTIONS.length - 1]
}

/**
 * the longest the encoder may run ahead of its cap, in seconds. The file is
 * bounded by maxrate * duration + bufsize, so the buffer is also held to a
 * fraction of the duration: two seconds is nothing on a five minute clip and a
 * fifth of a ten second one.
 */
const VBV_MAX_SECONDS = 2

/**
 * how far above the target the guessed quality size may sit before a quality cut
 * is ruled out without measuring. Past this the target binds and the two-pass
 * encode, which needs no measurement, takes over.
 */
const MEASURE_HEADROOM = 3

function bytesFor(totalK: number, durationSec: number): number {
    return Math.round((totalK * 1000 * durationSec) / 8)
}

/**
 * A hard ceiling for a quality encode. CRF alone has no size bound whatever, so
 * these are what hold a target: the encoder gives up quality before it exceeds
 * them.
 */
function vbvFor(
    targetBytes: number,
    durationSec: number,
    audioBitrateK: number
): { maxrateK: number; bufsizeK: number } {
    const totalK = Math.floor((targetBytes * 8 * SAFETY) / durationSec / 1000)
    const maxrateK = Math.max(MIN_VIDEO_BITRATE_K, totalK - audioBitrateK)
    const bufSeconds = Math.min(VBV_MAX_SECONDS, durationSec * (1 - SAFETY))
    return { maxrateK, bufsizeK: Math.max(1, Math.round(maxrateK * bufSeconds)) }
}

function qualityPlan(
    info: MediaInfo,
    durationSec: number,
    codec: Codec,
    measuredVideoK: number | null,
    audioBitrateK: number,
    vbv: { maxrateK: number; bufsizeK: number } | null
): ExportPlan {
    const videoBitrateK = measuredVideoK ?? fallbackQualityK(info, codec)

    return {
        mode: 'trim',
        durationSec,
        videoBitrateK,
        audioBitrateK,
        crf: QUALITY_CRF[codec],
        gop: gopFrames(info.fps),
        maxrateK: vbv?.maxrateK ?? null,
        bufsizeK: vbv?.bufsizeK ?? null,
        scaleHeight: null,
        downscaled: false,
        underTarget: vbv !== null,
        belowFloor: false,
        measured: measuredVideoK !== null,
        estimatedBytes: bytesFor(videoBitrateK + audioBitrateK, durationSec)
    }
}

/**
 * The encode plan, bitrate and optional downscale, worked out without running
 * anything, so the UI can show an estimate immediately.
 *
 * A target is a ceiling rather than a goal: where a quality cut already fits
 * under it, the quality plan is returned with the target as a hard cap instead.
 */
export function planCompress(
    info: MediaInfo,
    start: number,
    end: number,
    targetBytes: number,
    codec: Codec,
    mute: boolean,
    measuredVideoK: number | null = null
): ExportPlan {
    const durationSec = Math.max(0.1, end - start)
    const budgetTotalK = Math.floor((targetBytes * 8 * SAFETY) / durationSec / 1000)
    const audioBitrateK = mute || !info.hasAudio ? 0 : pickAudioBitrateK(budgetTotalK)

    const qualityVideoK = measuredVideoK ?? fallbackQualityK(info, codec)
    if (bytesFor(qualityVideoK + audioBitrateK, durationSec) <= targetBytes * SAFETY) {
        const vbv = vbvFor(targetBytes, durationSec, audioBitrateK)
        return qualityPlan(info, durationSec, codec, measuredVideoK, audioBitrateK, vbv)
    }

    const rawVideoBitrateK = budgetTotalK - audioBitrateK
    const videoBitrateK = Math.max(MIN_VIDEO_BITRATE_K, rawVideoBitrateK)
    const belowFloor = rawVideoBitrateK < MIN_VIDEO_BITRATE_K

    const heights = [info.height, ...DOWNSCALE_OPTIONS]
        .filter((h, i, a) => h <= info.height && a.indexOf(h) === i)
        .sort((a, b) => b - a)
    let chosen = heights[heights.length - 1] ?? info.height
    for (const h of heights) {
        if (videoBitrateK >= minBitrateForHeightK(h)) {
            chosen = h
            break
        }
    }

    return {
        mode: 'compress',
        durationSec,
        videoBitrateK,
        audioBitrateK,
        scaleHeight: chosen === info.height ? null : chosen,
        downscaled: chosen < info.height,
        underTarget: false,
        belowFloor,
        estimatedBytes: bytesFor(videoBitrateK + audioBitrateK, durationSec)
    }
}

/**
 * The same for a quality-targeted cut. With no budget to divide up, this
 * predicts the bitrate the encoder will settle on rather than choosing one: it
 * follows from resolution, frame rate and CRF, not from the source's own bitrate.
 */
export function planPrecise(
    info: MediaInfo,
    start: number,
    end: number,
    codec: Codec,
    mute: boolean,
    measuredVideoK: number | null = null
): ExportPlan {
    const durationSec = Math.max(0.1, end - start)
    const audioBitrateK = mute || !info.hasAudio ? 0 : PRECISE_AUDIO_K
    return qualityPlan(info, durationSec, codec, measuredVideoK, audioBitrateK, null)
}

/**
 * The renderer is the only caller, but its numbers reach ffmpeg's command line
 * and its arithmetic, where a NaN spreads silently into an estimate and a
 * negative seek becomes an encoder failure with nothing useful to say. Checked
 * here because both the estimate and the export come through resolvePlan.
 */
export function validateSpan(
    info: MediaInfo,
    start: number,
    end: number,
    targetBytes: number
): void {
    const numbers = [info.durationSec, start, end, targetBytes]
    if (
        !numbers.every((n) => Number.isFinite(n)) ||
        info.durationSec <= 0 ||
        targetBytes < 0 ||
        start < 0 ||
        start >= info.durationSec ||
        end <= start
    ) {
        throw new Error('That trim region cannot be exported.')
    }
}

/**
 * The plan the UI shows and the export runs, measuring the source first where
 * the answer turns on how expensive the content is. Both callers come through
 * here, so what was estimated is what gets encoded.
 */
export async function resolvePlan(
    info: MediaInfo,
    start: number,
    end: number,
    targetBytes: number,
    codec: Codec,
    mute: boolean
): Promise<ExportPlan> {
    validateSpan(info, start, end, targetBytes)
    const durationSec = Math.max(0.1, end - start)
    const guessedBytes = bytesFor(fallbackQualityK(info, codec) + PRECISE_AUDIO_K, durationSec)
    const worthMeasuring = targetBytes <= 0 || guessedBytes < targetBytes * MEASURE_HEADROOM
    const measured = worthMeasuring ? await measureVideoBitrateK(info, start, end, codec) : null

    return targetBytes > 0
        ? planCompress(info, start, end, targetBytes, codec, mute, measured)
        : planPrecise(info, start, end, codec, mute, measured)
}
