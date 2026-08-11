import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import {
    FileTextIcon as FileText,
    ArrowClockwiseIcon as ArrowClockwise
} from '@phosphor-icons/react'

interface Props {
    children: ReactNode
}

interface State {
    message: string | null
}

/**
 * The last resort for a render that throws. React unmounts the whole tree on an
 * uncaught error, so without this the window goes blank and takes the reason
 * with it. The message is shown and also sent to the main log, which is what the
 * user is being asked to send on.
 */
export default class ErrorBoundary extends Component<Props, State> {
    state: State = { message: null }

    static getDerivedStateFromError(err: unknown): State {
        return { message: err instanceof Error ? err.message : String(err) }
    }

    componentDidCatch(err: unknown, info: ErrorInfo): void {
        const stack = err instanceof Error ? (err.stack ?? err.message) : String(err)
        window.api.logError(`${stack}\n${info.componentStack ?? ''}`)
    }

    render(): ReactNode {
        const { message } = this.state
        if (message === null) return this.props.children

        return (
            <div className="crash">
                <div className="crash-inner">
                    <div className="crash-title">FFtrim ran into a problem</div>
                    <div className="crash-message mono">{message}</div>
                    <div className="crash-actions">
                        <button className="cta" onClick={() => window.location.reload()}>
                            <ArrowClockwise size={16} weight="bold" />
                            Reload
                        </button>
                        <button className="link" onClick={() => window.api.openLog()}>
                            <FileText size={13} weight="bold" />
                            Open log
                        </button>
                    </div>
                </div>
            </div>
        )
    }
}
