import type { JSX } from 'react'
import { useState } from 'react'
import { CrosshairSimpleIcon as CrosshairSimple } from '@phosphor-icons/react'
import { formatTime, parseTime } from '../lib/format'

interface Props {
    label: string
    value: number
    onCommit: (t: number) => void
    onSet: () => void
    setTitle: string
}

export default function TimePill({ label, value, onCommit, onSet, setTitle }: Props): JSX.Element {
    const [draft, setDraft] = useState<string | null>(null)
    const text = draft ?? formatTime(value)

    const commit = (): void => {
        const parsed = draft === null ? null : parseTime(draft)
        setDraft(null)
        if (parsed !== null) onCommit(parsed)
    }

    return (
        <div className="time-pill">
            <span className="tp-label">{label}</span>
            <div className="tp-box">
                <input
                    className="tp-value mono"
                    value={text}
                    onFocus={() => setDraft(formatTime(value))}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commit}
                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                />
                <button className="tp-btn" onClick={onSet} title={setTitle}>
                    <CrosshairSimple size={15} weight="bold" />
                </button>
            </div>
        </div>
    )
}
