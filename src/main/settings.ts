import { app } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { DEFAULT_SETTINGS, sanitizeSettings, type Settings } from '@shared/settings'
import { log } from './log'

const WRITE_DELAY_MS = 400

let current: Settings = DEFAULT_SETTINGS
let writeTimer: NodeJS.Timeout | null = null

function settingsPath(): string {
    return join(app.getPath('userData'), 'settings.json')
}

function write(): void {
    writeTimer = null
    try {
        writeFileSync(settingsPath(), JSON.stringify(current, null, 2), 'utf8')
    } catch (err) {
        log.warn('could not write settings', err)
    }
}

/** Call once the app is ready, a missing or corrupt file falls back to defaults. */
export function loadSettings(): void {
    try {
        current = sanitizeSettings(JSON.parse(readFileSync(settingsPath(), 'utf8')))
    } catch {
        current = DEFAULT_SETTINGS
    }
}

export function getSettings(): Settings {
    return current
}

/**
 * Writes are debounced because the renderer patches on every keystroke in the
 * custom size field.
 */
export function patchSettings(patch: Partial<Settings>): Settings {
    current = sanitizeSettings({ ...current, ...patch }, current)
    if (writeTimer) clearTimeout(writeTimer)
    writeTimer = setTimeout(write, WRITE_DELAY_MS)
    return current
}

/** Flush a pending debounced write before the process goes away. */
export function flushSettings(): void {
    if (!writeTimer) return
    clearTimeout(writeTimer)
    write()
}
