import { describe, it, expect } from 'vitest'
import { DEFAULT_SETTINGS, sanitizeSettings } from './settings'

describe('sanitizeSettings', () => {
    it('accepts a well formed set of settings', () => {
        const s = {
            targetMode: '10',
            customMB: '12',
            codec: 'h265',
            outputDir: 'C:\\out',
            panelCollapsed: true
        }
        expect(sanitizeSettings(s)).toEqual(s)
    })

    it('drops a remembered input folder left over from an older version', () => {
        expect(sanitizeSettings({ inputDir: 'C:\\clips' })).toEqual(DEFAULT_SETTINGS)
    })

    it('falls back to defaults for missing, unknown or wrongly typed fields', () => {
        expect(sanitizeSettings(undefined)).toEqual(DEFAULT_SETTINGS)
        expect(sanitizeSettings({})).toEqual(DEFAULT_SETTINGS)
        expect(sanitizeSettings({ targetMode: '17', codec: 'av1' })).toEqual(DEFAULT_SETTINGS)
        expect(sanitizeSettings({ customMB: 50 }).customMB).toBe(DEFAULT_SETTINGS.customMB)
    })

    it('rejects a custom size that is not a positive number', () => {
        expect(sanitizeSettings({ customMB: '0' }).customMB).toBe(DEFAULT_SETTINGS.customMB)
        expect(sanitizeSettings({ customMB: '-5' }).customMB).toBe(DEFAULT_SETTINGS.customMB)
        expect(sanitizeSettings({ customMB: 'abc' }).customMB).toBe(DEFAULT_SETTINGS.customMB)
    })

    it('treats an empty remembered directory as none', () => {
        expect(sanitizeSettings({ outputDir: '' }).outputDir).toBeNull()
        expect(sanitizeSettings({ outputDir: 42 }).outputDir).toBeNull()
    })

    it('only accepts a boolean for the collapsed panel', () => {
        expect(sanitizeSettings({ panelCollapsed: true }).panelCollapsed).toBe(true)
        expect(sanitizeSettings({ panelCollapsed: 'yes' }).panelCollapsed).toBe(false)
    })
})
