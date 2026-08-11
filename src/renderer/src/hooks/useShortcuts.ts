import { useEffect, useRef } from 'react'
import { SKIP_SECONDS } from './usePlayback'

export interface ShortcutHandlers {
    onTogglePlay: () => void
    onSkip: (delta: number) => void
    onStepFrame: (frames: number) => void
    onSetStart: () => void
    onSetEnd: () => void
    onExport: () => void
    onToggleControls: () => void
}

const TEXT_ENTRY = /^(INPUT|TEXTAREA|SELECT)$/

const REPEATABLE = new Set(['ArrowLeft', 'ArrowRight', ',', '.'])

function isTyping(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false
    return TEXT_ENTRY.test(target.tagName) || target.isContentEditable
}

/**
 * Global editing shortcuts, live whenever a file is loaded and the user is not
 * typing into a field.
 */
export function useShortcuts(enabled: boolean, handlers: ShortcutHandlers): void {
    const ref = useRef(handlers)

    useEffect(() => {
        ref.current = handlers
    })

    useEffect(() => {
        if (!enabled) return

        const onKeyDown = (e: KeyboardEvent): void => {
            if (e.ctrlKey || e.altKey || e.metaKey || isTyping(e.target)) return
            if (e.repeat && !REPEATABLE.has(e.key)) return

            const h = ref.current
            switch (e.key.toLowerCase()) {
                case ' ':
                    h.onTogglePlay()
                    break
                case 'arrowleft':
                    h.onSkip(-SKIP_SECONDS)
                    break
                case 'arrowright':
                    h.onSkip(SKIP_SECONDS)
                    break
                case ',':
                    h.onStepFrame(-1)
                    break
                case '.':
                    h.onStepFrame(1)
                    break
                case 'i':
                    h.onSetStart()
                    break
                case 'o':
                    h.onSetEnd()
                    break
                case 'f':
                    h.onToggleControls()
                    break
                case 'enter':
                    h.onExport()
                    break
                default:
                    return
            }

            e.preventDefault()

            const active = document.activeElement
            if (active instanceof HTMLElement && active.tagName === 'BUTTON') active.blur()
        }

        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [enabled])
}
