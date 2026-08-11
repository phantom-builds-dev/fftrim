import type { Codec, TargetMode } from './types'

/**
 * Preferences that survive a restart. Deliberately excludes anything that is a
 * per-clip decision (trim points, mute), and the folder the last source came from.
 */
export interface Settings {
    targetMode: TargetMode
    customMB: string
    codec: Codec
    outputDir: string | null
    panelCollapsed: boolean
}

export const DEFAULT_SETTINGS: Settings = {
    targetMode: '10',
    customMB: '10',
    codec: 'h264',
    outputDir: null,
    panelCollapsed: false
}

const TARGET_MODES: TargetMode[] = ['none', '10', '50', '100', '500', 'custom']
const CODECS: Codec[] = ['h264', 'h265']

/** whole megabytes, and no more digits than the field is sized to show. */
export const MAX_CUSTOM_MB_DIGITS = 4
export const MAX_CUSTOM_MB = 10 ** MAX_CUSTOM_MB_DIGITS - 1

function validCustomMB(value: unknown): value is string {
    return (
        typeof value === 'string' &&
        value.length <= MAX_CUSTOM_MB_DIGITS &&
        /^\d+$/.test(value) &&
        Number(value) > 0
    )
}

/**
 * Settings arrive from a file on disk that a user can edit and from an older
 * version of the app, so every field is checked.
 */
export function sanitizeSettings(raw: unknown, fallback: Settings = DEFAULT_SETTINGS): Settings {
    const v = (raw ?? {}) as Partial<Record<keyof Settings, unknown>>

    return {
        targetMode: TARGET_MODES.includes(v.targetMode as TargetMode)
            ? (v.targetMode as TargetMode)
            : fallback.targetMode,
        customMB: validCustomMB(v.customMB) ? v.customMB : fallback.customMB,
        codec: CODECS.includes(v.codec as Codec) ? (v.codec as Codec) : fallback.codec,
        outputDir: typeof v.outputDir === 'string' && v.outputDir ? v.outputDir : null,
        panelCollapsed:
            typeof v.panelCollapsed === 'boolean' ? v.panelCollapsed : fallback.panelCollapsed
    }
}
