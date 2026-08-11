import type { TargetMode } from '@shared/types'

export const MB = 1024 * 1024

export interface Preset {
    key: TargetMode
    label: string
    bytes: number
}

export const PRESETS: Preset[] = [
    { key: '10', label: '10 MB', bytes: 10 * MB },
    { key: '50', label: '50 MB', bytes: 50 * MB },
    { key: '100', label: '100 MB', bytes: 100 * MB },
    { key: '500', label: '500 MB', bytes: 500 * MB }
]

export function targetBytesFor(mode: TargetMode, customMB: string): number {
    if (mode === 'none') return 0
    if (mode === 'custom') {
        const mb = parseFloat(customMB)
        return Number.isFinite(mb) && mb > 0 ? mb * MB : 0
    }
    return PRESETS.find((p) => p.key === mode)?.bytes ?? 0
}
