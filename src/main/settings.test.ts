import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { DEFAULT_SETTINGS } from '@shared/settings'

let userDataDir = ''

vi.mock('electron', () => ({ app: { getPath: () => userDataDir } }))
vi.mock('./log', () => ({ log: { warn: () => {} } }))

const { loadSettings, getSettings, patchSettings, flushSettings } = await import('./settings')

function settingsFile(): string {
    return join(userDataDir, 'settings.json')
}

beforeEach(() => {
    userDataDir = mkdtempSync(join(tmpdir(), 'fftrim-settings-'))
    vi.useFakeTimers()
})

afterEach(() => {
    flushSettings()
    vi.useRealTimers()
    rmSync(userDataDir, { recursive: true, force: true })
})

describe('settings store', () => {
    it('falls back to defaults when there is no file', () => {
        loadSettings()
        expect(getSettings()).toEqual(DEFAULT_SETTINGS)
    })

    it('falls back to defaults when the file is corrupt', () => {
        writeFileSync(settingsFile(), 'not json at all', 'utf8')
        loadSettings()
        expect(getSettings()).toEqual(DEFAULT_SETTINGS)
    })

    it('reads back what it wrote', () => {
        loadSettings()
        patchSettings({ codec: 'h265', outputDir: 'C:\\clips' })
        vi.runAllTimers()

        loadSettings()
        expect(getSettings().codec).toBe('h265')
        expect(getSettings().outputDir).toBe('C:\\clips')
        expect(getSettings().targetMode).toBe(DEFAULT_SETTINGS.targetMode)
    })

    it('merges a patch rather than replacing the whole set', () => {
        loadSettings()
        patchSettings({ codec: 'h265' })
        patchSettings({ targetMode: '10' })
        expect(getSettings()).toEqual({ ...DEFAULT_SETTINGS, codec: 'h265', targetMode: '10' })
    })

    it('drops an invalid patch instead of storing it', () => {
        loadSettings()
        patchSettings({ customMB: 'nonsense' } as never)
        expect(getSettings().customMB).toBe(DEFAULT_SETTINGS.customMB)
    })

    it('keeps a custom size the field could hold and refuses the rest', () => {
        loadSettings()
        patchSettings({ customMB: '9999' })
        expect(getSettings().customMB).toBe('9999')

        for (const bad of ['', '0', '12000', '10.5']) {
            patchSettings({ customMB: bad })
            expect(getSettings().customMB).toBe('9999')
        }
    })

    it('debounces the write and flushes a pending one on demand', () => {
        loadSettings()
        patchSettings({ targetMode: '100' })
        expect(() => readFileSync(settingsFile(), 'utf8')).toThrow()

        flushSettings()
        expect(JSON.parse(readFileSync(settingsFile(), 'utf8')).targetMode).toBe('100')
    })

    it('does nothing on flush when no write is pending', () => {
        loadSettings()
        expect(() => flushSettings()).not.toThrow()
        expect(() => readFileSync(settingsFile(), 'utf8')).toThrow()
    })
})
