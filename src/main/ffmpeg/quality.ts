import type { Codec, MediaInfo } from '@shared/types'

/**
 * Visually lossless CRF for each encoder. The two scales are not comparable, so
 * these are not meant to be the same number.
 */
export const QUALITY_CRF: Record<Codec, number> = { h264: 18, h265: 22 }

/**
 * bits per pixel each encoder lands on at its QUALITY_CRF. A starting guess
 * only: two clips at identical resolution and capture settings measured 0.036
 * and 0.072 for h265, so anything needing accuracy measures instead (sample.ts).
 */
const QUALITY_BPP: Record<Codec, number> = { h264: 0.079, h265: 0.036 }

/**
 * keyframe interval, in seconds. Pinned so a two-second sample sees the same
 * I-frame density as the full encode it predicts; libx264's default of 250
 * frames would put far fewer in the sample than its own leading keyframe implies.
 */
const GOP_SECONDS = 2

/** assumed when audio is kept but its own bitrate is not known. */
export const PRECISE_AUDIO_K = 192

const FALLBACK_FPS = 30

export function gopFrames(fps: number): number {
    return Math.max(1, Math.round((fps || FALLBACK_FPS) * GOP_SECONDS))
}

/** pixels per second the encoder has to cover, in thousands. */
function pixelRateK(info: MediaInfo): number {
    return (info.width * info.height * (info.fps || FALLBACK_FPS)) / 1000
}

/** the bitrate a quality encode is guessed to need, when it has not been measured. */
export function fallbackQualityK(info: MediaInfo, codec: Codec): number {
    return Math.round(QUALITY_BPP[codec] * pixelRateK(info))
}
