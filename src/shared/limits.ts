/** the lowest video bitrate worth spending, whatever the budget works out to. */
export const MIN_VIDEO_BITRATE_K = 100

/** the cheapest audio on offer, and so what a budget this tight ends up on. */
export const MIN_AUDIO_BITRATE_K = 64

/** the fraction of a target actually spent, leaving space to land under it. */
export const SAFETY = 0.95

/**
 * the smallest target a clip of this length can be given, in bytes.
 * Rounded up, so a target at this figure is over the floor rather than on it.
 */
export function minTargetBytes(durationSec: number, hasAudio: boolean): number {
    const floorK = MIN_VIDEO_BITRATE_K + (hasAudio ? MIN_AUDIO_BITRATE_K : 0)
    return Math.ceil((floorK * 1000 * durationSec) / 8 / SAFETY)
}
