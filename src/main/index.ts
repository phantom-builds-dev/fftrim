import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { installCrashHandlers } from './log'
import { registerMediaScheme, registerMediaProtocol } from './media'
import { registerIpc } from './ipc'
import { createWindow, installNavigationGuards } from './window'
import { cancel, discardInFlightOutput } from './ffmpeg'
import { flushSettings, loadSettings } from './settings'

installCrashHandlers()
registerMediaScheme()

if (!app.requestSingleInstanceLock()) {
    app.quit()
} else {
    app.on('second-instance', () => {
        const win = BrowserWindow.getAllWindows()[0]
        if (win) {
            if (win.isMinimized()) win.restore()
            win.focus()
        }
    })

    installNavigationGuards()

    app.whenReady().then(() => {
        electronApp.setAppUserModelId('com.fftrim.app')
        app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))

        loadSettings()
        registerMediaProtocol()
        registerIpc()
        createWindow()

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow()
        })
    })

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit()
    })

    app.on('before-quit', () => {
        cancel()
        discardInFlightOutput()
        flushSettings()
    })
}
