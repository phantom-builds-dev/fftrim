export interface MediaInfo {
    path: string
    durationSec: number
    width: number
    height: number
    fps: number
    videoCodec: string
    audioCodec: string | null
    hasAudio: boolean
    sizeBytes: number
}

export type Codec = 'h264' | 'h265'

/** The two documents the About panel can open, as shipped under resources/licenses/. */
export type LicenseDoc = 'license' | 'notices'

export type TargetMode = 'none' | '10' | '50' | '100' | '500' | 'custom'

export interface ExportOptions {
    input: string
    output: string
    start: number
    end: number
    mode: 'trim' | 'compress'
    targetBytes?: number
    codec?: Codec
    mute?: boolean
}

export interface ExportPlan {
    mode: 'trim' | 'compress'
    durationSec: number
    videoBitrateK?: number
    audioBitrateK?: number
    scaleHeight?: number | null
    downscaled?: boolean
    underTarget?: boolean
    belowFloor?: boolean
    estimatedBytes?: number
    measured?: boolean
    crf?: number
    gop?: number
    maxrateK?: number | null
    bufsizeK?: number | null
}

export interface PlanArgs {
    info: MediaInfo
    start: number
    end: number
    targetBytes: number
    codec: Codec
    mute: boolean
}

export interface SaveArgs {
    input: string
    mode: 'trim' | 'compress'
}

export interface ExportArgs {
    opts: ExportOptions
    info: MediaInfo
}

export type ExportResult =
    { ok: true; output: string } | { ok: false; error: string; cancelled: boolean }
