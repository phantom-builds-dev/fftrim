import { describe, it, expect } from 'vitest'
import type { MediaInfo } from '@shared/types'
import { minTargetBytes } from '@shared/limits'
import { planCompress, planPrecise, validateSpan } from './plan'

const MB = 1024 * 1024

function info(overrides: Partial<MediaInfo> = {}): MediaInfo {
    return {
        path: 'C:\\clips\\in.mp4',
        durationSec: 60,
        width: 1920,
        height: 1080,
        fps: 30,
        videoCodec: 'h264',
        audioCodec: 'aac',
        hasAudio: true,
        sizeBytes: 100 * MB,
        ...overrides
    }
}

describe('planCompress', () => {
    it('splits the budget between video and audio and stays under the target', () => {
        const p = planCompress(info(), 0, 60, 8 * MB, 'h264', false)
        expect(p.audioBitrateK).toBe(128)
        expect(p.videoBitrateK).toBe(934)
        expect(p.estimatedBytes).toBe(7_965_000)
        expect(p.estimatedBytes!).toBeLessThan(8 * MB)
        expect(p.underTarget).toBe(false)
        expect(p.belowFloor).toBe(false)
    })

    it('downscales when the budget is too thin for the source resolution', () => {
        const p = planCompress(info(), 0, 60, 8 * MB, 'h264', false)
        expect(p.scaleHeight).toBe(720)
        expect(p.downscaled).toBe(true)
    })

    it('keeps the source resolution when the budget is generous', () => {
        const p = planCompress(
            info({ height: 720, durationSec: 10, sizeBytes: 200 * MB }),
            0,
            10,
            25 * MB,
            'h264',
            false,
            30_000
        )
        expect(p.videoBitrateK).toBe(19730)
        expect(p.scaleHeight).toBeNull()
        expect(p.downscaled).toBe(false)
    })

    it('never upscales a source below the smallest downscale option', () => {
        const p = planCompress(info({ height: 240, width: 320 }), 0, 60, 8 * MB, 'h264', false)
        expect(p.scaleHeight).toBeNull()
        expect(p.downscaled).toBe(false)
    })

    it('flags belowFloor and overshoots when the target is unreachable', () => {
        const p = planCompress(
            info({ durationSec: 600, sizeBytes: 500 * MB }),
            0,
            600,
            1 * MB,
            'h264',
            false
        )
        expect(p.belowFloor).toBe(true)
        expect(p.videoBitrateK).toBe(100)
        expect(p.estimatedBytes!).toBeGreaterThan(1 * MB)
    })

    /** the figure the UI refuses targets under has to be the figure the floor sits at. */
    it('clears the floor at the shared minimum target and not a byte under it', () => {
        const long = info({ durationSec: 600, sizeBytes: 500 * MB })
        const min = minTargetBytes(600, true)

        expect(planCompress(long, 0, 600, min, 'h264', false).belowFloor).toBe(false)
        expect(planCompress(long, 0, 600, min - 1, 'h264', false).belowFloor).toBe(true)

        const muted = minTargetBytes(600, false)
        expect(planCompress(long, 0, 600, muted, 'h264', true).belowFloor).toBe(false)
        expect(planCompress(long, 0, 600, muted - 1, 'h264', true).belowFloor).toBe(true)
    })

    it('drops the audio budget when muted or when there is no audio track', () => {
        expect(planCompress(info(), 0, 60, 8 * MB, 'h264', true).audioBitrateK).toBe(0)
        expect(
            planCompress(info({ hasAudio: false, audioCodec: null }), 0, 60, 8 * MB, 'h264', false)
                .audioBitrateK
        ).toBe(0)
    })

    /** eight megabytes is generous over ten seconds and tight over ten minutes. */
    it('scales the audio bitrate with the budget, not with the target alone', () => {
        expect(planCompress(info(), 0, 10, 8 * MB, 'h264', false, 30_000).audioBitrateK).toBe(192)
        expect(planCompress(info(), 0, 60, 8 * MB, 'h264', false).audioBitrateK).toBe(128)
        expect(
            planCompress(info({ durationSec: 600 }), 0, 600, 8 * MB, 'h264', false).audioBitrateK
        ).toBe(64)
    })

    it('keeps audio inside its share of the budget when it has to compete', () => {
        const p = planCompress(info(), 0, 60, 8 * MB, 'h264', false)
        expect(p.audioBitrateK! / (p.videoBitrateK! + p.audioBitrateK!)).toBeLessThanOrEqual(0.125)
    })

    it('clamps a zero-length selection to a positive duration', () => {
        expect(planCompress(info(), 12, 12, 8 * MB, 'h264', false).durationSec).toBe(0.1)
    })
})

describe('planCompress treating the target as a ceiling', () => {
    /** a quality cut of this clip measures well under any of the targets below. */
    const cheap = 2000

    it('cuts at quality instead of compressing when the target is not binding', () => {
        const p = planCompress(info(), 0, 60, 500 * MB, 'h264', false, cheap)
        expect(p.mode).toBe('trim')
        expect(p.underTarget).toBe(true)
        expect(p.videoBitrateK).toBe(cheap)
        expect(p.downscaled).toBe(false)
    })

    it('agrees with a plan that had no target at all, bar the size ceiling', () => {
        const capped = planCompress(info(), 0, 60, 500 * MB, 'h264', false, cheap)
        const free = planPrecise(info(), 0, 60, 'h264', false, cheap)
        expect(capped.videoBitrateK).toBe(free.videoBitrateK)
        expect(capped.audioBitrateK).toBe(free.audioBitrateK)
        expect(capped.crf).toBe(free.crf)
        expect(capped.estimatedBytes).toBe(free.estimatedBytes)
        expect(free.maxrateK).toBeNull()
        expect(capped.maxrateK).toBeGreaterThan(0)
    })

    /** the worst case VBV guarantees is maxrate for the whole clip plus one buffer. */
    it('bounds a non-binding target by maxrate and bufsize, not by the estimate', () => {
        const durationSec = 60
        const p = planCompress(info(), 0, durationSec, 100 * MB, 'h264', false, cheap)
        const worstBits = p.maxrateK! * 1000 * durationSec + p.bufsizeK! * 1000
        const worstBytes = worstBits / 8 + (p.audioBitrateK! * 1000 * durationSec) / 8
        expect(worstBytes).toBeLessThan(100 * MB)
    })

    it('keeps that bound on a short clip, where a fixed buffer would not', () => {
        const durationSec = 5
        const p = planCompress(info(), 0, durationSec, 50 * MB, 'h264', false, cheap)
        const worstBits = p.maxrateK! * 1000 * durationSec + p.bufsizeK! * 1000
        const worstBytes = worstBits / 8 + (p.audioBitrateK! * 1000 * durationSec) / 8
        expect(worstBytes).toBeLessThan(50 * MB)
    })

    it('still compresses when the target really does bind', () => {
        const p = planCompress(info(), 0, 60, 8 * MB, 'h264', false, cheap)
        expect(p.mode).toBe('compress')
        expect(p.underTarget).toBe(false)
        expect(p.maxrateK).toBeUndefined()
    })
})

/**
 * Two clips exported for real, both 2560x1440 AV1 game capture at ~33 Mbps.
 * Their h265 bitrates differ by a factor of two despite identical resolution,
 * encoder and settings, which is what the measurement exists to catch.
 */
const shot = {
    info: info({ width: 2560, height: 1440, fps: 59.9869, durationSec: 150.017 }),
    start: 123.860859,
    end: 142.353505,
    h264VideoK: 17_534,
    h264Bytes: 40_992_922,
    h265VideoK: 8_053,
    h265Bytes: 19_075_472
}

const busier = {
    info: info({ width: 2560, height: 1440, fps: 60.0002, durationSec: 150.017 }),
    start: 138.453836,
    end: 146.939869,
    h265VideoK: 15_975,
    h265Bytes: 16_947_051
}

function errorAgainst(actual: number, expected: number): number {
    return Math.abs(actual - expected) / expected
}

describe('planPrecise', () => {
    it('turns a measured bitrate into the size the encoder actually produced', () => {
        const h264 = planPrecise(shot.info, shot.start, shot.end, 'h264', false, shot.h264VideoK)
        const h265 = planPrecise(shot.info, shot.start, shot.end, 'h265', false, shot.h265VideoK)
        const other = planPrecise(
            busier.info,
            busier.start,
            busier.end,
            'h265',
            true,
            busier.h265VideoK
        )

        expect(errorAgainst(h264.estimatedBytes!, shot.h264Bytes)).toBeLessThan(0.02)
        expect(errorAgainst(h265.estimatedBytes!, shot.h265Bytes)).toBeLessThan(0.02)
        expect(errorAgainst(other.estimatedBytes!, busier.h265Bytes)).toBeLessThan(0.02)
    })

    it('says so when the estimate was measured rather than guessed', () => {
        expect(planPrecise(info(), 0, 60, 'h264', false, 5000).measured).toBe(true)
        expect(planPrecise(info(), 0, 60, 'h264', false).measured).toBe(false)
    })

    it('gives h265 a smaller guess than h264 for the same cut', () => {
        const h264 = planPrecise(info(), 0, 60, 'h264', false)
        const h265 = planPrecise(info(), 0, 60, 'h265', false)
        expect(h265.estimatedBytes!).toBeLessThan(h264.estimatedBytes!)
    })

    it('guesses from pixel rate rather than from the source size', () => {
        const big = planPrecise(info({ sizeBytes: 500 * MB }), 0, 60, 'h264', false)
        const small = planPrecise(info({ sizeBytes: 5 * MB }), 0, 60, 'h264', false)
        expect(big.videoBitrateK).toBe(small.videoBitrateK)

        const half = planPrecise(info({ width: 960, height: 540 }), 0, 60, 'h264', false)
        expect(half.videoBitrateK).toBe(Math.round(big.videoBitrateK! / 4))
    })

    it('never downscales, and imposes no ceiling without a target', () => {
        const p = planPrecise(info(), 0, 60, 'h264', false)
        expect(p.mode).toBe('trim')
        expect(p.scaleHeight).toBeNull()
        expect(p.downscaled).toBe(false)
        expect(p.underTarget).toBe(false)
        expect(p.maxrateK).toBeNull()
        expect(p.belowFloor).toBe(false)
    })

    it('drops the audio budget when muted or when there is no audio track', () => {
        expect(planPrecise(info(), 0, 60, 'h264', true).audioBitrateK).toBe(0)
        expect(
            planPrecise(info({ hasAudio: false, audioCodec: null }), 0, 60, 'h264', false)
                .audioBitrateK
        ).toBe(0)
    })

    it('clamps a zero-length selection to a positive duration', () => {
        expect(planPrecise(info(), 12, 12, 'h264', false).durationSec).toBe(0.1)
    })
})

describe('validateSpan', () => {
    it('accepts a region inside the file', () => {
        expect(() => validateSpan(info(), 0, 60, 10 * MB)).not.toThrow()
        expect(() => validateSpan(info(), 12.5, 30, 0)).not.toThrow()
    })

    it('rejects anything that is not a finite number', () => {
        expect(() => validateSpan(info(), NaN, 60, 0)).toThrow()
        expect(() => validateSpan(info(), 0, Infinity, 0)).toThrow()
        expect(() => validateSpan(info(), 0, 60, NaN)).toThrow()
        expect(() => validateSpan(info({ durationSec: NaN }), 0, 60, 0)).toThrow()
    })

    it('rejects an inverted, empty or out of range region', () => {
        expect(() => validateSpan(info(), 30, 10, 0)).toThrow()
        expect(() => validateSpan(info(), 30, 30, 0)).toThrow()
        expect(() => validateSpan(info(), -1, 30, 0)).toThrow()
        expect(() => validateSpan(info(), 61, 90, 0)).toThrow()
    })

    it('rejects a negative target and a file with no duration', () => {
        expect(() => validateSpan(info(), 0, 60, -1)).toThrow()
        expect(() => validateSpan(info({ durationSec: 0 }), 0, 60, 0)).toThrow()
    })
})
