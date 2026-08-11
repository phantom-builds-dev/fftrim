import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import { existsSync } from 'fs'
import { join, basename, dirname, extname, resolve } from 'path'
import type { SaveArgs } from '@shared/types'
import { CH } from '@shared/channels'
import { VIDEO_EXTENSIONS } from '@shared/media'
import { getMainWindow } from '../window'
import { allowWrite } from '../media/access'
import { acceptSource, lastSourceDir } from '../media/open'
import { getSettings, patchSettings } from '../settings'

/**
 * The last directory exported to wins, falling back to the source's own when
 * there is none or it has gone away (a removed drive, say).
 */
function outputDirFor(input: string): string {
    const remembered = getSettings().outputDir
    return remembered && existsSync(remembered) ? remembered : dirname(input)
}

/**
 * The next file opened in a sitting is usually a sibling of the last one, so the
 * dialog starts where the previous source came from. A folder that has gone away
 * is dropped, leaving the dialog wherever the OS puts it.
 */
function lastInputDir(): string | undefined {
    const remembered = lastSourceDir()
    return remembered && existsSync(remembered) ? remembered : undefined
}

/** Both modes re-encode, so the output is an mp4 whatever the source was. */
function suggestOutputPath(input: string, mode: 'trim' | 'compress'): string {
    const base = basename(input, extname(input))
    const suffix = mode === 'trim' ? 'trimmed' : 'compressed'
    return join(outputDirFor(input), `${base}_${suffix}.mp4`)
}

function showOpen(
    win: BrowserWindow | null,
    options: Electron.OpenDialogOptions
): Promise<Electron.OpenDialogReturnValue> {
    return win ? dialog.showOpenDialog(win, options) : dialog.showOpenDialog(options)
}

function showSave(
    win: BrowserWindow | null,
    options: Electron.SaveDialogOptions
): Promise<Electron.SaveDialogReturnValue> {
    return win ? dialog.showSaveDialog(win, options) : dialog.showSaveDialog(options)
}

function showError(win: BrowserWindow | null, message: string, detail: string): Promise<unknown> {
    const options: Electron.MessageBoxOptions = { type: 'error', message, detail }
    return win ? dialog.showMessageBox(win, options) : dialog.showMessageBox(options)
}

export function registerDialogIpc(): void {
    ipcMain.handle(CH.dialogOpen, async () => {
        const res = await showOpen(getMainWindow(), {
            defaultPath: lastInputDir(),
            properties: ['openFile'],
            filters: [
                { name: 'Video', extensions: VIDEO_EXTENSIONS },
                { name: 'All Files', extensions: ['*'] }
            ]
        })

        if (res.canceled || res.filePaths.length === 0) return null
        acceptSource(res.filePaths[0])
        return res.filePaths[0]
    })

    ipcMain.handle(CH.dialogSave, async (_e, args: SaveArgs) => {
        const defaultPath = suggestOutputPath(args.input, args.mode)
        const res = await showSave(getMainWindow(), {
            defaultPath,
            filters: [{ name: 'MP4 Video', extensions: ['mp4'] }]
        })
        if (res.canceled || !res.filePath) return null
        if (resolve(res.filePath) === resolve(args.input)) {
            await showError(
                getMainWindow(),
                'Choose a different file',
                'The output cannot overwrite the source video.'
            )
            return null
        }
        allowWrite(res.filePath)
        patchSettings({ outputDir: dirname(res.filePath) })
        return res.filePath
    })

    ipcMain.handle(CH.shellShowItem, (_e, filePath: string) => {
        shell.showItemInFolder(filePath)
    })
}
