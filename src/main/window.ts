import { app, BrowserWindow, dialog, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { CH } from '@shared/channels'
import { isExporting } from './ffmpeg'
import icon from '../../resources/icon.png?asset'

let mainWindow: BrowserWindow | null = null

function openExternal(url: string): void {
    if (url.startsWith('https://') || url.startsWith('http://')) shell.openExternal(url)
}

function isAppUrl(url: string): boolean {
    const devUrl = process.env['ELECTRON_RENDERER_URL']
    if (is.dev && devUrl) return url.startsWith(devUrl)
    try {
        return new URL(url).protocol === 'file:'
    } catch {
        return false
    }
}

export function installNavigationGuards(): void {
    app.on('web-contents-created', (_, contents) => {
        contents.on('will-navigate', (event, url) => {
            if (isAppUrl(url)) return
            event.preventDefault()
            openExternal(url)
        })
        contents.on('will-attach-webview', (event) => event.preventDefault())
    })
}

export function getMainWindow(): BrowserWindow | null {
    return mainWindow
}

/**
 * Mirrors export progress onto the taskbar button, where it is visible while the
 * window is in the background. A fraction of -1 clears it.
 */
export function setTaskbarProgress(fraction: number): void {
    const win = mainWindow
    if (win && !win.isDestroyed()) win.setProgressBar(fraction)
}

/** Flashes the taskbar button until the window is brought back to the front. */
export function flashForAttention(): void {
    const win = mainWindow
    if (!win || win.isDestroyed() || win.isFocused()) return
    win.flashFrame(true)
    win.once('focus', () => {
        if (!win.isDestroyed()) win.flashFrame(false)
    })
}

/**
 * Closing during an export kills it and throws the partial file away, which on a
 * long encode is a lot to lose to a stray click. Synchronous because a close can
 * only be stopped from within the handler.
 */
function confirmDiscardExport(win: BrowserWindow): boolean {
    const choice = dialog.showMessageBoxSync(win, {
        type: 'warning',
        buttons: ['Keep exporting', 'Discard and close'],
        defaultId: 0,
        cancelId: 0,
        message: 'An export is still running.',
        detail: 'Closing now stops it and deletes the part that has been written.'
    })
    return choice === 1
}

/**
 * Builds the single application window. The icon is set explicitly for the dev
 * run, which would otherwise show Electron's own; a packaged build takes it from
 * the executable.
 */
export function createWindow(): BrowserWindow {
    const win = new BrowserWindow({
        width: 1000,
        height: 760,
        minWidth: 760,
        minHeight: 580,
        show: false,
        frame: false,
        backgroundColor: '#22262F',
        title: 'FFtrim',
        icon,
        autoHideMenuBar: true,
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: true,
            contextIsolation: true,
            nodeIntegration: false
        }
    })
    mainWindow = win

    win.maximize()

    win.on('ready-to-show', () => win.show())
    win.on('close', (event) => {
        if (isExporting() && !confirmDiscardExport(win)) event.preventDefault()
    })
    win.on('closed', () => {
        if (mainWindow === win) mainWindow = null
    })

    const sendMaxState = (): void => {
        if (!win.isDestroyed()) win.webContents.send(CH.windowMaximized, win.isMaximized())
    }
    win.on('maximize', sendMaxState)
    win.on('unmaximize', sendMaxState)

    win.webContents.setWindowOpenHandler((details) => {
        openExternal(details.url)
        return { action: 'deny' }
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        win.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        win.loadFile(join(__dirname, '../renderer/index.html'))
    }

    return win
}
