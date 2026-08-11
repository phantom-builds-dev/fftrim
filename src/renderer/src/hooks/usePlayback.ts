import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'

export interface VideoBindings {
    ref: RefObject<HTMLVideoElement | null>
    onTimeUpdate: () => void
    onPlay: () => void
    onPause: () => void
}

export interface Playback {
    currentTime: number
    playing: boolean
    seek: (t: number) => void
    skip: (delta: number) => void
    stepFrame: (frames: number) => void
    togglePlay: () => void
    videoProps: VideoBindings
}

export const SKIP_SECONDS = 10

const FALLBACK_FPS = 30

const EASING = 0.15

const RESYNC_SECONDS = 0.25

interface PlayState {
    src: string | null
    currentTime: number
    playing: boolean
}

function atStart(src: string | null): PlayState {
    return { src, currentTime: 0, playing: false }
}

/**
 * playhead + play/pause, bounded by the trim region.
 */
export function usePlayback(src: string | null, start: number, end: number, fps: number): Playback {
    const videoRef = useRef<HTMLVideoElement>(null)
    const pendingPlay = useRef(false)
    const [state, setState] = useState<PlayState>(() => atStart(src))
    const current = state.src === src ? state : atStart(src)

    const update = useCallback(
        (fn: (s: PlayState) => PlayState) => setState((s) => fn(s.src === src ? s : atStart(src))),
        [src]
    )

    const seek = useCallback(
        (t: number) => {
            const v = videoRef.current
            pendingPlay.current = false
            if (v) v.currentTime = t
            update((s) => ({ ...s, currentTime: t }))
        },
        [update]
    )

    /**
     * Moving a trim handle past the playhead drags the playhead with it.
     */
    useEffect(() => {
        const v = videoRef.current
        if (!v || end <= start) return
        const clamped = Math.min(Math.max(v.currentTime, start), end)
        if (clamped === v.currentTime) return
        v.currentTime = clamped
        update((s) => ({ ...s, currentTime: clamped }))
    }, [start, end, update])

    const skip = useCallback(
        (delta: number) => {
            const v = videoRef.current
            if (!v) return
            seek(Math.min(end, Math.max(start, v.currentTime + delta)))
        },
        [seek, start, end]
    )

    /**
     * Frame stepping pauses first, nudging the playhead under
     * a running video would be undone by the next frame anyway.
     */
    const stepFrame = useCallback(
        (frames: number) => {
            const v = videoRef.current
            if (!v) return
            v.pause()
            const delta = frames / (fps > 0 ? fps : FALLBACK_FPS)
            seek(Math.min(end, Math.max(start, v.currentTime + delta)))
        },
        [seek, start, end, fps]
    )

    const togglePlay = useCallback(() => {
        const v = videoRef.current
        if (!v) return
        if (!v.paused || pendingPlay.current) {
            pendingPlay.current = false
            v.pause()
            return
        }
        if (v.ended || v.currentTime < start || v.currentTime >= end) {
            pendingPlay.current = true
            v.addEventListener(
                'seeked',
                () => {
                    if (!pendingPlay.current) return
                    pendingPlay.current = false
                    void v.play()
                },
                { once: true }
            )
            v.currentTime = start
            return
        }
        void v.play()
    }, [start, end])

    const stopAtEnd = useCallback(
        (v: HTMLVideoElement): boolean => {
            if (v.currentTime < end) return false
            v.pause()
            v.currentTime = end
            return true
        },
        [end]
    )

    const syncTime = useCallback(() => {
        const v = videoRef.current
        if (!v) return
        stopAtEnd(v)
        update((s) => (s.currentTime === v.currentTime ? s : { ...s, currentTime: v.currentTime }))
    }, [stopAtEnd, update])

    /**
     * while the video is running the playhead position is taken
     * once per displayed frame for a smooth walk through the timeline.
     */
    useEffect(() => {
        if (!current.playing) return
        let previous = 0
        let shown = -1

        const tick = (now: number): void => {
            frame = requestAnimationFrame(tick)
            const v = videoRef.current
            if (!v) return

            const elapsed = previous > 0 ? (now - previous) / 1000 : 0
            previous = now

            const stopped = stopAtEnd(v)
            const media = v.currentTime
            if (stopped || shown < 0 || Math.abs(media - shown) > RESYNC_SECONDS) {
                shown = media
            } else {
                shown += elapsed * v.playbackRate
                shown = Math.min(shown + (media - shown) * EASING, end)
            }

            update((s) => (s.currentTime === shown ? s : { ...s, currentTime: shown }))
        }

        let frame = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(frame)
    }, [current.playing, stopAtEnd, end, update])

    const onPlay = useCallback(() => update((s) => ({ ...s, playing: true })), [update])

    /**
     * Pausing drops the eased estimate for the element's exact time, so a trim
     * point set from a stopped playhead is the frame the user is looking at.
     */
    const onPause = useCallback(() => {
        const v = videoRef.current
        update((s) => ({ ...s, playing: false, currentTime: v ? v.currentTime : s.currentTime }))
    }, [update])

    const videoProps = useMemo<VideoBindings>(
        () => ({ ref: videoRef, onTimeUpdate: syncTime, onPlay, onPause }),
        [syncTime, onPlay, onPause]
    )

    return {
        currentTime: current.currentTime,
        playing: current.playing,
        seek,
        skip,
        stepFrame,
        togglePlay,
        videoProps
    }
}
