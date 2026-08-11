import type {
    MediaInfo,
    ExportOptions,
    ExportPlan,
    ExportResult,
    LicenseDoc,
    PlanArgs
} from './types'
import type { Settings } from './settings'

export interface Api {
    appVersion: () => string
    openLog: () => Promise<void>
    openLicense: (doc: LicenseDoc) => Promise<void>
    logError: (message: string) => void
    getSettings: () => Settings
    saveSettings: (patch: Partial<Settings>) => void
    openFile: () => Promise<string | null>
    acceptDrop: (input: string) => Promise<void>
    probe: (input: string) => Promise<MediaInfo>
    plan: (args: PlanArgs) => Promise<ExportPlan>
    chooseSavePath: (input: string, mode: 'trim' | 'compress') => Promise<string | null>
    runExport: (opts: ExportOptions, info: MediaInfo) => Promise<ExportResult>
    cancelExport: () => Promise<void>
    showInFolder: (filePath: string) => Promise<void>
    onProgress: (cb: (fraction: number) => void) => () => void
    mediaUrl: (filePath: string) => string
    minimize: () => Promise<void>
    toggleMaximize: () => Promise<void>
    closeWindow: () => Promise<void>
    isMaximized: () => Promise<boolean>
    onMaximizeChange: (cb: (maximized: boolean) => void) => () => void
    pathForFile: (file: File) => string
}
