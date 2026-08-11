/**
 * Faults outside React's reach (event handlers, timers, rejected promises)
 * which would otherwise reach nothing but the devtools console. The boundary
 * covers rendering, this covers everything else.
 */
export function reportUncaught(): void {
    window.addEventListener('error', (e) => {
        window.api.logError(e.error instanceof Error ? (e.error.stack ?? e.message) : e.message)
    })
    window.addEventListener('unhandledrejection', (e) => {
        const reason: unknown = e.reason
        window.api.logError(
            reason instanceof Error ? (reason.stack ?? reason.message) : String(reason)
        )
    })
}
