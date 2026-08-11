import { useCallback, useEffect, useState } from 'react'

export interface WindowState {
    maximized: boolean
    minimize: () => void
    toggleMaximize: () => void
    close: () => void
}

export function useWindowState(): WindowState {
    const [maximized, setMaximized] = useState(false)

    useEffect(() => {
        void window.api.isMaximized().then(setMaximized)
        return window.api.onMaximizeChange(setMaximized)
    }, [])

    return {
        maximized,
        minimize: useCallback(() => window.api.minimize(), []),
        toggleMaximize: useCallback(() => window.api.toggleMaximize(), []),
        close: useCallback(() => window.api.closeWindow(), [])
    }
}
