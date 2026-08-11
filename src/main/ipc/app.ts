import { ipcMain, app, shell } from 'electron'
import { join } from 'path'
import type { LicenseDoc } from '@shared/types'
import { CH } from '@shared/channels'
import { log, logFilePath } from '../log'

/** enough for a message and a stack, and no more than the log should take. */
const MAX_RENDERER_ERROR = 4000

/**
 * electron-builder copies both documents into resources/licenses/ under names of
 * its own; an unpackaged run reads them from the repository root instead. The
 * renderer only ever names which one it wants, so nothing it sends reaches a path.
 */
function licensePath(doc: LicenseDoc): string {
    if (doc === 'notices') {
        const name = 'THIRD-PARTY-NOTICES.md'
        return app.isPackaged
            ? join(process.resourcesPath, 'licenses', name)
            : join(app.getAppPath(), name)
    }
    return app.isPackaged
        ? join(process.resourcesPath, 'licenses', 'GPLv3.txt')
        : join(app.getAppPath(), 'LICENSE')
}

/**
 * The version read is synchronous because it is shown from the first frame, the
 * settings read is synchronous for the same reason.
 *
 * Renderer faults are written to the same file as everything else. Without this
 * the crash screen would point the user at a log that says nothing about it.
 */
export function registerAppIpc(): void {
    ipcMain.on(CH.appVersion, (e) => {
        e.returnValue = app.getVersion()
    })

    ipcMain.handle(CH.appOpenLog, async () => {
        await shell.openPath(logFilePath())
    })

    ipcMain.handle(CH.appOpenLicense, async (_e, doc: LicenseDoc) => {
        await shell.openPath(licensePath(doc))
    })

    ipcMain.on(CH.appLogError, (_e, message: unknown) => {
        log.error('renderer', String(message).slice(0, MAX_RENDERER_ERROR))
    })
}
