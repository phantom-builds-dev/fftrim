import { useCallback, useState } from 'react'
import type { MediaInfo } from '@shared/types'

export const MIN_TRIM = 1

interface Region {
    info: MediaInfo | null
    start: number
    end: number
}

export interface Trim {
    start: number
    end: number
    trimDuration: number
    setStart: (t: number) => void
    setEnd: (t: number) => void
}

function fullRange(info: MediaInfo | null): Region {
    return { info, start: 0, end: info?.durationSec ?? 0 }
}

export function useTrim(info: MediaInfo | null): Trim {
    const [region, setRegion] = useState<Region>(() => fullRange(info))
    const current = region.info === info ? region : fullRange(info)

    const update = useCallback(
        (fn: (r: Region) => Region) => setRegion((r) => fn(r.info === info ? r : fullRange(info))),
        [info]
    )

    const setStart = useCallback(
        (t: number) => update((r) => ({ ...r, start: Math.max(0, Math.min(t, r.end - MIN_TRIM)) })),
        [update]
    )

    const setEnd = useCallback(
        (t: number) =>
            update((r) => ({
                ...r,
                end: Math.min(r.info?.durationSec ?? 0, Math.max(t, r.start + MIN_TRIM))
            })),
        [update]
    )

    return {
        start: current.start,
        end: current.end,
        trimDuration: Math.max(0, current.end - current.start),
        setStart,
        setEnd
    }
}
