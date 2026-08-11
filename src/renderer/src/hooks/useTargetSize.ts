import { useMemo } from 'react'
import type { TargetMode } from '@shared/types'
import { minTargetBytes } from '@shared/limits'
import { targetBytesFor } from '../lib/targets'

export interface TargetSize {
    targetBytes: number
    compressing: boolean
    minBytes: number
    belowMinimum: boolean
}

/**
 * The chosen mode is a persisted setting, so this derives from it.
 */
export function useTargetSize(
    mode: TargetMode,
    customMB: string,
    trimDuration: number,
    hasAudio: boolean
): TargetSize {
    const targetBytes = useMemo(() => targetBytesFor(mode, customMB), [mode, customMB])
    const minBytes = useMemo(() => minTargetBytes(trimDuration, hasAudio), [trimDuration, hasAudio])
    const compressing = mode !== 'none'

    return {
        targetBytes,
        compressing,
        minBytes,
        belowMinimum: compressing && targetBytes < minBytes
    }
}
