import { rm, stat } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomBytes } from 'crypto'
import type { Codec, MediaInfo } from '@shared/types'
import { log } from '../log'
import { ffmpegPath } from './paths'
import { QUALITY_CRF, gopFrames } from './quality'
import { isCancelled, run, TimeoutError } from './process'

const CHUNK_SEC = 2
const CHUNKS = 2
const SAMPLE_TIMEOUT_MS = 120_000

/**
 * how far the sampled span may move before the measurement is taken again.
 * Complexity varies across a recording but not from one second to the next, so
 * nudging a trim handle costs no further encode.
 */
const REGION_SEC = 15

const measured = new Map<string, number>()
const unmeasurable = new Set<string>()
const inFlight = new Map<string, Promise<number | null>>()

function cacheKey(info: MediaInfo, codec: Codec, midpoint: number): string {
    return `${info.path}|${info.sizeBytes}|${codec}|${Math.round(midpoint / REGION_SEC)}`
}

/** evenly spaced points to sample from, kept inside the span. */
function samplePoints(start: number, end: number): number[] {
    const span = end - start
    const points: number[] = []
    for (let i = 0; i < CHUNKS; i++) {
        const centre = start + (span * (i + 0.5)) / CHUNKS
        points.push(Math.min(Math.max(start, centre - CHUNK_SEC / 2), end - CHUNK_SEC))
    }
    return points
}

/**
 * Encodes one chunk as the real export would and reports its size. The settings
 * must match preciseCut's or the bitrate does not carry over, hence the shared
 * CRF and keyframe interval.
 */
async function chunkBytes(
    info: MediaInfo,
    codec: Codec,
    at: number,
    seconds: number
): Promise<number> {
    const out = join(tmpdir(), `fftrim-sample-${randomBytes(6).toString('hex')}.mp4`)
    try {
        // prettier-ignore
        await run(
            ffmpegPath,
            [
                '-hide_banner', '-nostdin',
                '-y',
                '-ss', String(at),
                '-i', info.path,
                '-t', String(seconds),
                '-c:v', codec === 'h265' ? 'libx265' : 'libx264',
                '-crf', String(QUALITY_CRF[codec]),
                '-pix_fmt', 'yuv420p',
                '-g', String(gopFrames(info.fps)),
                '-an',
                out
            ],
            { timeoutMs: SAMPLE_TIMEOUT_MS, cancellable: true }
        )
        return (await stat(out)).size
    } finally {
        await rm(out, { force: true }).catch(() => {})
    }
}

/**
 * The video bitrate a quality encode of this span will land on, found by
 * encoding a little of it. Null when the sample could not be taken, leaving the
 * caller on its guessed figure rather than failing the estimate.
 *
 * A span short enough to encode whole is measured outright, which costs no more
 * and is exact.
 */
export async function measureVideoBitrateK(
    info: MediaInfo,
    start: number,
    end: number,
    codec: Codec
): Promise<number | null> {
    const span = Math.max(0.1, end - start)
    const key = cacheKey(info, codec, start + span / 2)

    const hit = measured.get(key)
    if (hit !== undefined) return hit
    if (unmeasurable.has(key)) return null
    const pending = inFlight.get(key)
    if (pending) return pending

    const whole = span <= CHUNKS * CHUNK_SEC
    const points = whole ? [start] : samplePoints(start, end)
    const seconds = whole ? span : CHUNK_SEC

    const task = (async (): Promise<number | null> => {
        try {
            let bytes = 0
            for (const at of points) bytes += await chunkBytes(info, codec, at, seconds)
            const bitrateK = Math.round((bytes * 8) / (points.length * seconds) / 1000)
            measured.set(key, bitrateK)
            return bitrateK
        } catch (err) {
            // A sample slow enough to time out will be slow again, and every nudge
            // of a trim handle asks for one: remember that this span is not worth
            // measuring. Ordinary failures are cheap and left to retry.
            if (err instanceof TimeoutError) unmeasurable.add(key)
            else if (!isCancelled()) log.warn('could not sample the source for an estimate', err)
            return null
        } finally {
            inFlight.delete(key)
        }
    })()

    inFlight.set(key, task)
    return task
}
