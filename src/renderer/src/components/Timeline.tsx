import type { JSX } from 'react'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

interface Props {
    duration: number
    start: number
    end: number
    currentTime: number
    minGap: number
    onChangeStart: (t: number) => void
    onChangeEnd: (t: number) => void
    onSeek: (t: number) => void
}

type Drag = 'start' | 'end' | 'seek' | null

export default function Timeline({
    duration,
    start,
    end,
    currentTime,
    minGap,
    onChangeStart,
    onChangeEnd,
    onSeek
}: Props): JSX.Element {
    const trackRef = useRef<HTMLDivElement>(null)
    const dragRef = useRef<Drag>(null)
    const dragAbortRef = useRef<AbortController | null>(null)
    const [trackWidth, setTrackWidth] = useState(0)

    /**
     * The track is measured so everything on it can be placed in pixels instead
     * of a percentage.
     */
    useLayoutEffect(() => {
        const el = trackRef.current
        if (!el) return
        const measure = (): void => setTrackWidth(el.getBoundingClientRect().width)

        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    const posToTime = useCallback(
        (clientX: number): number => {
            const el = trackRef.current
            if (!el) return 0
            const rect = el.getBoundingClientRect()
            const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
            return ratio * duration
        },
        [duration]
    )

    const handleMove = useCallback(
        (e: PointerEvent) => {
            const t = posToTime(e.clientX)
            if (dragRef.current === 'start') onChangeStart(Math.max(0, Math.min(t, end - minGap)))
            else if (dragRef.current === 'end')
                onChangeEnd(Math.min(duration, Math.max(t, start + minGap)))
            else if (dragRef.current === 'seek') onSeek(t)
        },
        [posToTime, onChangeStart, onChangeEnd, onSeek, start, end, minGap, duration]
    )

    const beginDrag = useCallback(
        (kind: Drag, e: ReactPointerEvent) => {
            e.preventDefault()
            dragRef.current = kind
            if (kind === 'seek') onSeek(posToTime(e.clientX))

            dragAbortRef.current?.abort()
            const drag = new AbortController()
            dragAbortRef.current = drag
            window.addEventListener('pointermove', handleMove, { signal: drag.signal })
            window.addEventListener(
                'pointerup',
                () => {
                    dragRef.current = null
                    drag.abort()
                },
                { signal: drag.signal }
            )
        },
        [handleMove, onSeek, posToTime]
    )

    const px = (t: number): number => {
        if (duration <= 0) return 0
        const dpr = window.devicePixelRatio || 1
        const x = (Math.min(Math.max(t, 0), duration) / duration) * trackWidth
        return Math.round(x * dpr) / dpr
    }

    const playedEnd = Math.max(start, Math.min(end, currentTime))

    return (
        <div className="tl-track" ref={trackRef} onPointerDown={(e) => beginDrag('seek', e)}>
            <div className="tl-base" />
            <div className="tl-selected" style={{ left: px(start), width: px(end) - px(start) }} />
            <div
                className="tl-played"
                style={{ left: px(start), width: px(playedEnd) - px(start) }}
            />
            <div
                className="tl-playhead"
                style={{ transform: `translateX(${px(currentTime)}px)` }}
            />
            <div
                className="tl-handle"
                style={{ left: px(start) }}
                onPointerDown={(e) => {
                    e.stopPropagation()
                    beginDrag('start', e)
                }}
            />
            <div
                className="tl-handle"
                style={{ left: px(end) }}
                onPointerDown={(e) => {
                    e.stopPropagation()
                    beginDrag('end', e)
                }}
            />
        </div>
    )
}
