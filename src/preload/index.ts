import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { Api } from '@shared/api'
import { CH } from '@shared/channels'
import { mediaUrlFor } from '@shared/media'

const api: Api = {
    appVersion: () => ipcRenderer.sendSync(CH.appVersion),
    openLog: () => ipcRenderer.invoke(CH.appOpenLog),
    openLicense: (doc) => ipcRenderer.invoke(CH.appOpenLicense, doc),
    logError: (message) => ipcRenderer.send(CH.appLogError, message),
    getSettings: () => ipcRenderer.sendSync(CH.settingsGet),
    saveSettings: (patch) => ipcRenderer.send(CH.settingsPatch, patch),
    openFile: () => ipcRenderer.invoke(CH.dialogOpen),
    acceptDrop: (input) => ipcRenderer.invoke(CH.mediaAcceptDrop, input),
    probe: (input) => ipcRenderer.invoke(CH.mediaProbe, input),
    plan: (args) => ipcRenderer.invoke(CH.mediaPlan, args),
    chooseSavePath: (input, mode) => ipcRenderer.invoke(CH.dialogSave, { input, mode }),
    runExport: (opts, info) => ipcRenderer.invoke(CH.exportRun, { opts, info }),
    cancelExport: () => ipcRenderer.invoke(CH.exportCancel),
    showInFolder: (filePath) => ipcRenderer.invoke(CH.shellShowItem, filePath),
    onProgress: (cb) => {
        const listener = (_e: unknown, fraction: number): void => cb(fraction)
        ipcRenderer.on(CH.exportProgress, listener)
        return () => ipcRenderer.removeListener(CH.exportProgress, listener)
    },
    mediaUrl: (filePath) => mediaUrlFor(filePath),
    minimize: () => ipcRenderer.invoke(CH.windowMinimize),
    toggleMaximize: () => ipcRenderer.invoke(CH.windowToggleMaximize),
    closeWindow: () => ipcRenderer.invoke(CH.windowClose),
    isMaximized: () => ipcRenderer.invoke(CH.windowIsMaximized),
    onMaximizeChange: (cb) => {
        const listener = (_e: unknown, maximized: boolean): void => cb(maximized)
        ipcRenderer.on(CH.windowMaximized, listener)
        return () => ipcRenderer.removeListener(CH.windowMaximized, listener)
    },
    pathForFile: (file: File) => webUtils.getPathForFile(file)
}

contextBridge.exposeInMainWorld('api', api)
