import { ipcMain } from 'electron'
import type { Settings } from '@shared/settings'
import { CH } from '@shared/channels'
import { getSettings, patchSettings } from '../settings'

/**
 * The read is synchronous so the renderer can seed its initial state on first
 * render, rather than flashing defaults and correcting itself a tick later.
 */
export function registerSettingsIpc(): void {
    ipcMain.on(CH.settingsGet, (e) => {
        e.returnValue = getSettings()
    })

    ipcMain.on(CH.settingsPatch, (_e, patch: Partial<Settings>) => {
        patchSettings(patch)
    })
}
