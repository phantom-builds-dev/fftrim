import { ipcMain, BrowserWindow, IpcMainInvokeEvent } from 'electron'
import { CH } from '@shared/channels'

function senderWindow(e: IpcMainInvokeEvent): BrowserWindow | null {
    return BrowserWindow.fromWebContents(e.sender)
}

export function registerWindowIpc(): void {
    ipcMain.handle(CH.windowMinimize, (e) => senderWindow(e)?.minimize())

    ipcMain.handle(CH.windowToggleMaximize, (e) => {
        const win = senderWindow(e)
        if (!win) return
        if (win.isMaximized()) win.unmaximize()
        else win.maximize()
    })

    ipcMain.handle(CH.windowClose, (e) => senderWindow(e)?.close())
    ipcMain.handle(CH.windowIsMaximized, (e) => senderWindow(e)?.isMaximized() ?? false)
}
