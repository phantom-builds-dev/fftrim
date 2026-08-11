import { useCallback, useState } from 'react'
import type { Settings } from '@shared/settings'

export interface SettingsState {
    settings: Settings
    patch: (p: Partial<Settings>) => void
}

export function useSettings(): SettingsState {
    const [settings, setSettings] = useState<Settings>(() => window.api.getSettings())

    const patch = useCallback((p: Partial<Settings>) => {
        setSettings((prev) => ({ ...prev, ...p }))
        window.api.saveSettings(p)
    }, [])

    return { settings, patch }
}
