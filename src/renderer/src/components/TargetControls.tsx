import type { JSX } from 'react'
import { ArrowUpIcon as ArrowUp, WarningIcon as Warning } from '@phosphor-icons/react'
import type { TargetMode } from '@shared/types'
import { MAX_CUSTOM_MB, MAX_CUSTOM_MB_DIGITS } from '@shared/settings'
import { MB, PRESETS } from '../lib/targets'

interface Props {
    mode: TargetMode
    onChangeMode: (m: TargetMode) => void
    customMB: string
    onChangeCustomMB: (mb: string) => void
    belowMinimum: boolean
    minBytes: number
    onSetTarget: (mb: number) => void
}

/**
 * Whole megabytes only. Going past the last digit clamps the value at 9999
 * instead of ignoring the later digits.
 * Values lower than the minimum are allowed, since the UI tells the user.
 */
function normalizeMB(value: string): string {
    const digits = value.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
    if (!digits) return ''
    return digits.length > MAX_CUSTOM_MB_DIGITS ? String(MAX_CUSTOM_MB) : digits
}

/**
 * A target too small to encode is handled here
 */
export default function TargetControls({
    mode,
    onChangeMode,
    customMB,
    onChangeCustomMB,
    belowMinimum,
    minBytes,
    onSetTarget
}: Props): JSX.Element {
    const minMB = Math.min(MAX_CUSTOM_MB, Math.ceil(minBytes / MB))

    return (
        <div className="ctrl-row">
            <span className="ctrl-label">Target size</span>
            <div className="ctrl-body">
                <div className="segmented">
                    <button
                        className={mode === 'none' ? 'seg active' : 'seg'}
                        onClick={() => onChangeMode('none')}
                    >
                        None
                    </button>
                    {PRESETS.map((p) => (
                        <button
                            key={p.key}
                            className={mode === p.key ? 'seg active' : 'seg'}
                            onClick={() => onChangeMode(p.key)}
                        >
                            {p.label}
                        </button>
                    ))}
                    <button
                        className={mode === 'custom' ? 'seg active' : 'seg'}
                        onClick={() => onChangeMode('custom')}
                    >
                        Custom
                    </button>
                </div>

                <div className="target-field">
                    {mode === 'custom' && (
                        <div className="custom-size">
                            <input
                                className="custom-input mono"
                                type="text"
                                inputMode="numeric"
                                value={customMB}
                                onChange={(e) => onChangeCustomMB(normalizeMB(e.target.value))}
                                onFocus={(e) => e.target.select()}
                            />
                            <span className="custom-unit">MB</span>
                        </div>
                    )}

                    {belowMinimum && (
                        <div className="target-warn">
                            <span className="tw-msg">
                                <Warning size={13} weight="bold" />
                                minimum target size is {minMB} MB at this length
                            </span>
                            <button className="link" onClick={() => onSetTarget(minMB)}>
                                <ArrowUp size={13} weight="bold" />
                                Set to {minMB} MB
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
