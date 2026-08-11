import { rmSync, existsSync, statSync } from 'fs'
import { rm } from 'fs/promises'
import { tmpdir } from 'os'
import { dirname, join, resolve } from 'path'
import { randomBytes } from 'crypto'
import type { MediaInfo, ExportOptions, ExportPlan } from '@shared/types'
import { log } from '../log'
import { nullSink } from './paths'
import { resolvePlan, validateSpan } from './plan'
import { runFfmpeg, resetCancel, type ProgressCb } from './process'

const PASS1_WEIGHT = 0.3

/**
 * A killed encoder does not release its output file the moment the signal is
 * sent, and Windows refuses to unlink a file that is still open. These retries
 * are what stand between a cancel and a truncated mp4 left in the user's folder.
 */
const DISCARD_ATTEMPTS = 5
const DISCARD_WAIT_MS = 100

let running = false
let inFlightOutput: string | null = null

export function isExporting(): boolean {
    return running
}

/** Blocks the calling thread; only used on the quit path, which cannot await. */
function sleepSync(ms: number): void {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

export function discardInFlightOutput(): void {
    if (!inFlightOutput) return
    const target = inFlightOutput
    inFlightOutput = null

    for (let attempt = 0; attempt < DISCARD_ATTEMPTS; attempt++) {
        try {
            rmSync(target, { force: true })
            return
        } catch (err) {
            if (attempt === DISCARD_ATTEMPTS - 1) {
                log.warn('could not remove partial output', target, err)
                return
            }
            sleepSync(DISCARD_WAIT_MS)
        }
    }
}

/**
 * Both ends of the export, checked before anything is spawned. The source was
 * probed when it was loaded, which may have been a long time and a removed drive
 * ago, and the folder was chosen in a dialog rather than written to. Without
 * this both arrive as a bare encoder exit code.
 */
function checkPaths(opts: ExportOptions): void {
    let source: boolean
    try {
        source = statSync(opts.input).isFile()
    } catch {
        source = false
    }
    if (!source) {
        throw new Error('The source video is no longer there. It may have been moved or deleted.')
    }
    if (!existsSync(dirname(opts.output))) {
        throw new Error('The folder you chose no longer exists. Pick another place to save.')
    }
}

/**
 * Runs an export to completion, one at a time, removing a partial output if it
 * fails. The plan is resolved here rather than taken from the renderer.
 *
 * The guards run before the output is claimed: past that point a failure deletes
 * the output, and a rejected export must not delete a file it never wrote.
 */
export async function runExport(
    opts: ExportOptions,
    info: MediaInfo,
    onProgress: ProgressCb
): Promise<void> {
    if (running) throw new Error('An export is already in progress.')
    if (resolve(opts.input) === resolve(opts.output)) {
        throw new Error('The output file must be different from the source file.')
    }
    validateSpan(info, opts.start, opts.end, opts.targetBytes ?? 0)
    checkPaths(opts)

    running = true
    inFlightOutput = opts.output
    resetCancel()
    try {
        const plan = await resolvePlan(
            info,
            opts.start,
            opts.end,
            opts.targetBytes ?? 0,
            opts.codec ?? 'h264',
            opts.mute ?? false
        )
        if (plan.mode === 'trim') await preciseCut(opts, info, plan, onProgress)
        else await twoPassEncode(opts, plan, info, onProgress)
    } catch (err) {
        await rm(opts.output, { force: true }).catch(() => {})
        throw err
    } finally {
        running = false
        inFlightOutput = null
        resetCancel()
    }
}

/**
 * Audio is re-encoded even where the source track could have been copied: a copy
 * cannot cut on an exact frame boundary, leaving up to half a second of earlier
 * audio at the head of the file for the player to discard.
 */
function preciseAudioArgs(opts: ExportOptions, info: MediaInfo, plan: ExportPlan): string[] {
    if (opts.mute || !info.hasAudio) return ['-an']
    return ['-c:a', 'aac', '-b:a', `${plan.audioBitrateK}k`]
}

/**
 * Quality-targeted cut. Every frame is re-encoded, which is what puts the in
 * point exactly where it was asked for: a stream copy can only start on a
 * keyframe, dragging the cut back by up to a GOP.
 *
 * `-maxrate` and `-bufsize` appear when a size target is in play, see vbvFor.
 *
 * The frame rate is left alone. There is no stats file to keep in step here, so
 * a variable frame rate source keeps its own timing.
 */
async function preciseCut(
    opts: ExportOptions,
    info: MediaInfo,
    plan: ExportPlan,
    onProgress: ProgressCb
): Promise<void> {
    const codec = opts.codec ?? 'h264'
    const vcodec = codec === 'h265' ? 'libx265' : 'libx264'
    const { durationSec } = plan
    const cap = plan.maxrateK
        ? ['-maxrate', `${plan.maxrateK}k`, '-bufsize', `${plan.bufsizeK}k`]
        : []

    // prettier-ignore
    await runFfmpeg(
        [
            '-y',
            '-ss', String(opts.start),
            '-i', opts.input,
            '-t', String(durationSec),
            '-c:v', vcodec,
            '-crf', String(plan.crf),
            '-g', String(plan.gop),
            '-pix_fmt', 'yuv420p',
            ...cap,
            ...(codec === 'h265' ? ['-tag:v', 'hvc1'] : []),
            ...preciseAudioArgs(opts, info, plan),
            '-movflags', '+faststart',
            opts.output
        ],
        durationSec,
        onProgress
    )
}

/**
 * Bitrate-targeted encode in two passes.
 *
 * `-fps_mode cfr` is required on both passes: they must produce the same frame
 * count or x264's second pass runs off the end of the stats file and crashes.
 * Left to itself ffmpeg picks VFR for pass 1 (the null muxer allows it) and CFR
 * for pass 2 (mp4 does not), which differs by a duplicated frame on any source
 * that is not perfectly constant frame rate.
 *
 * The stats files are named relative to a working directory. x265 takes its
 * whole option set as one colon-separated string, so an absolute Windows path
 * ends at the drive letter's colon: `stats=C:\...` is read as `stats=C`, and the
 * stats and cutree files, hundreds of megabytes on a long clip, land in
 * whatever directory the app was launched from.
 */
async function twoPassEncode(
    opts: ExportOptions,
    plan: ExportPlan,
    info: MediaInfo,
    onProgress: ProgressCb
): Promise<void> {
    const codec = opts.codec ?? 'h264'
    const vcodec = codec === 'h265' ? 'libx265' : 'libx264'
    const { durationSec } = plan
    const workDir = tmpdir()
    const passLog = `fftrim-${randomBytes(6).toString('hex')}`
    const statsFile = `${passLog}.log`
    const vf = plan.scaleHeight ? ['-vf', `scale=-2:${plan.scaleHeight}`] : []
    const vbr = `${plan.videoBitrateK}k`

    const passArgs = (n: 1 | 2): string[] =>
        codec === 'h265'
            ? ['-x265-params', `pass=${n}:stats=${statsFile}:log-level=error`]
            : ['-passlogfile', passLog, '-pass', String(n)]

    // prettier-ignore
    const common = (n: 1 | 2): string[] => [
        '-y',
        '-ss', String(opts.start),
        '-i', opts.input,
        '-t', String(durationSec),
        '-c:v', vcodec,
        '-b:v', vbr,
        '-fps_mode', 'cfr',
        '-pix_fmt', 'yuv420p',
        ...(codec === 'h265' ? ['-tag:v', 'hvc1'] : []),
        ...vf,
        ...passArgs(n)
    ]

    const pass1 = [...common(1), '-an', '-f', 'null', nullSink]

    const audioArgs =
        opts.mute || !info.hasAudio ? ['-an'] : ['-c:a', 'aac', '-b:a', `${plan.audioBitrateK}k`]
    const pass2 = [...common(2), ...audioArgs, '-movflags', '+faststart', opts.output]

    try {
        await runFfmpeg(pass1, durationSec, (f) => onProgress(f * PASS1_WEIGHT), workDir)
        await runFfmpeg(
            pass2,
            durationSec,
            (f) => onProgress(PASS1_WEIGHT + f * (1 - PASS1_WEIGHT)),
            workDir
        )
    } finally {
        await cleanupPassLogs(workDir, passLog, statsFile)
    }
}

async function cleanupPassLogs(workDir: string, passLog: string, statsFile: string): Promise<void> {
    const candidates = [
        `${passLog}-0.log`,
        `${passLog}-0.log.mbtree`,
        statsFile,
        `${statsFile}.cutree`
    ]
    await Promise.all(candidates.map((f) => rm(join(workDir, f), { force: true }).catch(() => {})))
}
