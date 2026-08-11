import { registerAppIpc } from './app'
import { registerDialogIpc } from './dialogs'
import { registerMediaIpc } from './media'
import { registerExportIpc } from './export'
import { registerWindowIpc } from './window'
import { registerSettingsIpc } from './settings'

export function registerIpc(): void {
    registerAppIpc()
    registerDialogIpc()
    registerMediaIpc()
    registerExportIpc()
    registerWindowIpc()
    registerSettingsIpc()
}
