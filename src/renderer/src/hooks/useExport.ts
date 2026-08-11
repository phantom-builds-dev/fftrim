import { useCallback, useEffect, useRef, useState } from 'react'
import type { Codec, ExportPlan, MediaInfo } from '@shared/types'
import { MIN_TRIM } from './useTrim'

export interface ExportStatus {
    kind: 'error' | 'done'
    text: string
    output?: string
    logged?: boolean
}

export interface Export {
    plan: ExportPlan | null
    estimating: boolean
    exporting: boolean
    progress: number
    status: ExportStatus | null
    run: () => Promise<void>
    cancel: () => void
}

/** planning can encode a sample of the source, so it waits for a drag to settle. */
const PLAN_DEBOUNCE_MS = 300

/** how long a plan may take before the wait is shown to the user */
const SLOW_PLAN_MS = 500

interface Args {
    info: MediaInfo | null
    start: number
    end: number
    targetBytes: number
    compressing: boolean
    belowMinimum: boolean
    codec: Codec
    mute: boolean
}

/**
 * the plan estimate and the export itself.
 *
 * A plan outlives the settings that produced it only where the next one will be
 * close: dragging a trim handle keeps the last figure on screen instead of
 * blanking it on every tick. A target, codec or mute change is a different
 * answer entirely, so the plan is dropped and the estimate says it is working
 * rather than showing a number belonging to a choice the user has moved on from.
 *
 * A target below what the encoder can hold is handlded in this function.
 * Every change restarts the debounce and the slow-plan
 * timer with it, so the waiting note only appears once the trim has settled.
 */
export function useExport({
    info,
    start,
    end,
    targetBytes,
    compressing,
    belowMinimum,
    codec,
    mute
}: Args): Export {
    const [planned, setPlanned] = useState<{
        info: MediaInfo
        key: string
        plan: ExportPlan
    } | null>(null)
    const [recorded, setRecorded] = useState<{
        info: MediaInfo | null
        status: ExportStatus
    } | null>(null)
    const [exporting, setExporting] = useState(false)
    const [estimating, setEstimating] = useState(false)
    const [progress, setProgress] = useState(0)

    /**
     * The exporting flag cannot hold the door on its own: it is only raised once
     * the save dialog has been answered, so a second Enter in the meantime would
     * open a second dialog.
     */
    const busy = useRef(false)
    const planKey = `${compressing ? targetBytes : 0}|${codec}|${mute}`
    const planning = info !== null && !belowMinimum
    const current = planned?.info === info && planned.key === planKey
    const plan = planning && current ? planned.plan : null
    const status = recorded?.info === info ? recorded.status : null

    const setStatus = useCallback(
        (s: ExportStatus | null) => setRecorded(s ? { info, status: s } : null),
        [info]
    )

    useEffect(() => {
        if (!planning || !info) return
        let stale = false
        const slow = setTimeout(() => !stale && setEstimating(true), SLOW_PLAN_MS)
        const debounce = setTimeout(() => {
            window.api
                .plan({ info, start, end, targetBytes: compressing ? targetBytes : 0, codec, mute })
                .then((p) => {
                    if (!stale) setPlanned({ info, key: planKey, plan: p })
                })
                .catch(() => {
                    if (!stale) setPlanned(null)
                })
                .finally(() => {
                    if (stale) return
                    clearTimeout(slow)
                    setEstimating(false)
                })
        }, PLAN_DEBOUNCE_MS)

        return () => {
            stale = true
            clearTimeout(slow)
            clearTimeout(debounce)
            setEstimating(false)
        }
    }, [info, start, end, targetBytes, compressing, codec, mute, planning, planKey])

    useEffect(() => window.api.onProgress(setProgress), [])

    const run = useCallback(async () => {
        if (!info || exporting || busy.current) return

        if (end - start < MIN_TRIM - 0.001) {
            setStatus({ kind: 'error', text: `Trim region must be at least ${MIN_TRIM}s.` })
            return
        }
        if (belowMinimum) return

        const mode = compressing ? 'compress' : 'trim'
        busy.current = true
        try {
            const output = await window.api.chooseSavePath(info.path, mode)
            if (!output) return

            setExporting(true)
            setProgress(0)
            setStatus(null)
            const res = await window.api.runExport(
                {
                    input: info.path,
                    output,
                    start,
                    end,
                    mode,
                    targetBytes: compressing ? targetBytes : undefined,
                    codec,
                    mute
                },
                info
            )
            if (res.ok) setStatus({ kind: 'done', text: `Saved ${output}`, output })
            else if (!res.cancelled)
                setStatus({ kind: 'error', text: res.error ?? 'Export failed.', logged: true })
        } catch (err) {
            setStatus({
                kind: 'error',
                text: err instanceof Error ? err.message : String(err),
                logged: true
            })
        } finally {
            busy.current = false
            setExporting(false)
            setProgress(0)
        }
    }, [
        info,
        exporting,
        start,
        end,
        compressing,
        belowMinimum,
        targetBytes,
        codec,
        mute,
        setStatus
    ])

    const cancel = useCallback(() => window.api.cancelExport(), [])

    return { plan, estimating, exporting, progress, status, run, cancel }
}
