import type { JSX, ReactNode } from 'react'

interface Props {
    collapsed: boolean
    children: ReactNode
}

/**
 * The block below the timeline, can be fully collapsed on demand.
 */
export default function ControlsPanel({ collapsed, children }: Props): JSX.Element | null {
    if (collapsed) return null

    return <section className="controls">{children}</section>
}
