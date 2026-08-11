import type { JSX } from 'react'
import {
    ExportIcon as Export,
    ArrowDownIcon as ArrowDown,
    ArrowSquareOutIcon as ArrowSquareOut,
    FileTextIcon as FileText
} from '@phosphor-icons/react'
import type { Codec, ExportPlan, MediaInfo } from '@shared/types'
import type { ExportStatus } from '../hooks/useExport'
import { formatBytes } from '../lib/format'

interface Props {
    info: MediaInfo
    plan: ExportPlan | null
    compressing: boolean
    belowMinimum: boolean
    codec: Codec
    status: ExportStatus | null
    estimating: boolean
    exporting: boolean
    progress: number
    onExport: () => void
    onCancel: () => void
}

/**
 * What the size reads while there is no figure worth showing. A target under the
 * minimum gets a dash, since no estimate can be promised at all. A plan still
 * being worked out gets the units without a number.
 */
function sizeLabel(belowMinimum: boolean, pending: boolean, bytes: number): string {
    if (belowMinimum) return '—'
    if (pending) return '… MB'
    return `~${formatBytes(bytes)}`
}

/**
 * The estimate, and the export button.
 */
export default function EstimateRow({
    info,
    plan,
    compressing,
    belowMinimum,
    codec,
    status,
    estimating,
    exporting,
    progress,
    onExport,
    onCancel
}: Props): JSX.Element {
    const estimateBytes = plan?.estimatedBytes ?? 0
    const outputHeight = plan?.scaleHeight ?? info.height
    const estCodec = codec === 'h265' ? 'H.265' : 'H.264'
    const pending = estimating || plan === null

    const pct = Math.round(progress * 100)

    return (
        <div className="ctrl-row estimate-row">
            <div className="est-left">
                <span className="ctrl-label">Estimate</span>
                <div className="est-body">
                    <span className="est-size mono">
                        {sizeLabel(belowMinimum, pending, estimateBytes)}
                    </span>
                    <div className="est-meta">
                        <span className="mono est-dim">{outputHeight}p</span>
                        <span className="fm-dot">•</span>
                        <span className="est-dim">{estCodec}</span>
                    </div>
                </div>

                <div className="est-sub">
                    {plan?.downscaled && (
                        <span className="badge-down">
                            <ArrowDown size={13} weight="bold" />
                            downscaled to fit target
                        </span>
                    )}
                    {plan?.underTarget && (
                        <span className="est-note">
                            already under target: cutting at source quality
                        </span>
                    )}
                    {!compressing && (
                        <span className="est-note">
                            exact cut at source quality: final size may differ
                        </span>
                    )}
                    {estimating && <span className="est-note">measuring the source…</span>}
                    {status?.kind === 'error' && (
                        <span className="est-error">
                            {status.text}
                            {status.logged && (
                                <button className="link" onClick={() => window.api.openLog()}>
                                    <FileText size={13} weight="bold" />
                                    Open log
                                </button>
                            )}
                        </span>
                    )}
                    {status?.kind === 'done' && (
                        <span className="est-done">
                            Saved
                            <button
                                className="link"
                                onClick={() =>
                                    status.output && window.api.showInFolder(status.output)
                                }
                            >
                                <ArrowSquareOut size={13} weight="bold" />
                                Show in folder
                            </button>
                        </span>
                    )}
                </div>
            </div>

            <div className="est-right">
                {exporting ? (
                    <div className="exporting">
                        <div className="progress">
                            <div className="progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="progress-pct mono">{pct}%</span>
                        <button className="btn-ghost" onClick={onCancel}>
                            Cancel
                        </button>
                    </div>
                ) : (
                    <button
                        className="cta"
                        onClick={onExport}
                        disabled={belowMinimum}
                        title={belowMinimum ? 'The target is below the minimum' : 'Export (Enter)'}
                    >
                        <Export size={18} weight="bold" />
                        {compressing ? 'Compress & export' : 'Export trim'}
                    </button>
                )}
            </div>
        </div>
    )
}
