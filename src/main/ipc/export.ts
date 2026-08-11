import { ipcMain } from 'electron'
import type { ExportArgs, ExportResult } from '@shared/types'
import { CH } from '@shared/channels'
import { runExport, cancel, CancelledError, isExporting } from '../ffmpeg'
import { allowRead, isReadAllowed, isWriteAllowed } from '../media/access'
import { setTaskbarProgress, flashForAttention } from '../window'
import { userMessage } from '../errors'
import { log } from '../log'

const PROGRESS_MIN_DELTA = 0.005
const PROGRESS_MIN_MS = 80

export function registerExportIpc(): void {
    ipcMain.handle(CH.exportRun, async (e, args: ExportArgs): Promise<ExportResult> => {
        if (isExporting()) {
            return { ok: false, error: 'An export is already in progress.', cancelled: false }
        }
        if (!isReadAllowed(args.opts.input) || !isWriteAllowed(args.opts.output)) {
            return {
                ok: false,
                error: 'This file has not been chosen by the user.',
                cancelled: false
            }
        }

        let lastSent = -1
        let lastAt = 0
        const send = (fraction: number): void => {
            const now = Date.now()
            const isEdge = fraction === 1 || lastSent < 0
            if (
                !isEdge &&
                fraction - lastSent < PROGRESS_MIN_DELTA &&
                now - lastAt < PROGRESS_MIN_MS
            ) {
                return
            }
            lastSent = fraction
            lastAt = now
            setTaskbarProgress(fraction)
            if (!e.sender.isDestroyed()) e.sender.send(CH.exportProgress, fraction)
        }

        try {
            await runExport(args.opts, args.info, send)
            allowRead(args.opts.output)
            flashForAttention()
            return { ok: true, output: args.opts.output }
        } catch (err) {
            const cancelled = err instanceof CancelledError
            if (!cancelled) {
                log.error('export failed', err)
                flashForAttention()
            }
            return { ok: false, error: userMessage(err), cancelled }
        } finally {
            setTaskbarProgress(-1)
        }
    })

    ipcMain.handle(CH.exportCancel, () => {
        cancel()
    })
}
