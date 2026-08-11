import type { JSX } from 'react'
import { useCallback, useState } from 'react'
import Titlebar from './components/Titlebar'
import Topbar from './components/Topbar'
import DropZone from './components/DropZone'
import Preview from './components/Preview'
import Transport from './components/Transport'
import TrimControls from './components/TrimControls'
import TargetControls from './components/TargetControls'
import EncodeControls from './components/EncodeControls'
import EstimateRow from './components/EstimateRow'
import ControlsPanel from './components/ControlsPanel'
import { useMediaFile } from './hooks/useMediaFile'
import { useTrim } from './hooks/useTrim'
import { usePlayback } from './hooks/usePlayback'
import { useTargetSize } from './hooks/useTargetSize'
import { useSettings } from './hooks/useSettings'
import { useShortcuts } from './hooks/useShortcuts'
import { useExport, type ExportStatus } from './hooks/useExport'

/**
 * The controls panel is pinned open for the duration of an export whatever the
 * stored preference says, since the progress is displayed here.
 */
export default function App(): JSX.Element {
    const { settings, patch } = useSettings()
    const { info, mediaUrl, error: loadError, previewFailed, onPreviewError, open } = useMediaFile()
    const { start, end, trimDuration, setStart, setEnd } = useTrim(info)
    const { currentTime, playing, seek, skip, stepFrame, togglePlay, videoProps } = usePlayback(
        mediaUrl,
        start,
        end,
        info?.fps ?? 0
    )
    const [mute, setMute] = useState(false)

    const { targetBytes, compressing, minBytes, belowMinimum } = useTargetSize(
        settings.targetMode,
        settings.customMB,
        trimDuration,
        Boolean(info?.hasAudio) && !mute
    )

    const {
        plan,
        estimating,
        exporting,
        progress,
        status: exportStatus,
        run,
        cancel
    } = useExport({
        info,
        start,
        end,
        targetBytes,
        compressing,
        belowMinimum,
        codec: settings.codec,
        mute
    })

    const setTarget = useCallback(
        (mb: number) => patch({ targetMode: 'custom', customMB: String(mb) }),
        [patch]
    )

    const collapsed = settings.panelCollapsed && !exporting
    const toggleCollapsed = useCallback(() => {
        if (!exporting) patch({ panelCollapsed: !settings.panelCollapsed })
    }, [exporting, patch, settings.panelCollapsed])

    useShortcuts(Boolean(info), {
        onTogglePlay: togglePlay,
        onSkip: skip,
        onStepFrame: stepFrame,
        onSetStart: useCallback(() => setStart(currentTime), [setStart, currentTime]),
        onSetEnd: useCallback(() => setEnd(currentTime), [setEnd, currentTime]),
        onExport: run,
        onToggleControls: toggleCollapsed
    })

    const status: ExportStatus | null =
        exportStatus ?? (loadError ? { kind: 'error', text: loadError, logged: true } : null)

    return (
        <div className="app">
            <Titlebar />
            {info && <Topbar info={info} onOpen={open} />}

            <main className="stage">
                {mediaUrl ? (
                    <Preview
                        src={mediaUrl}
                        muted={mute}
                        videoProps={videoProps}
                        failed={previewFailed}
                        codec={info?.videoCodec ?? ''}
                        onTogglePlay={togglePlay}
                        onError={onPreviewError}
                    />
                ) : (
                    <DropZone onOpen={open} error={loadError} />
                )}
            </main>

            {info && (
                <>
                    <Transport
                        duration={info.durationSec}
                        start={start}
                        end={end}
                        currentTime={currentTime}
                        playing={playing}
                        collapsed={collapsed}
                        canCollapse={!exporting}
                        onChangeStart={setStart}
                        onChangeEnd={setEnd}
                        onSeek={seek}
                        onSkip={skip}
                        onTogglePlay={togglePlay}
                        onToggleCollapsed={toggleCollapsed}
                    />

                    <ControlsPanel collapsed={collapsed}>
                        <TrimControls
                            start={start}
                            end={end}
                            currentTime={currentTime}
                            trimDuration={trimDuration}
                            onChangeStart={setStart}
                            onChangeEnd={setEnd}
                        />

                        <TargetControls
                            mode={settings.targetMode}
                            onChangeMode={(targetMode) => patch({ targetMode })}
                            customMB={settings.customMB}
                            onChangeCustomMB={(customMB) => patch({ customMB })}
                            belowMinimum={belowMinimum}
                            minBytes={minBytes}
                            onSetTarget={setTarget}
                        />

                        <EncodeControls
                            codec={settings.codec}
                            onChangeCodec={(codec) => patch({ codec })}
                            mute={mute}
                            onChangeMute={setMute}
                        />

                        <div className="divider" />

                        <EstimateRow
                            info={info}
                            plan={plan}
                            compressing={compressing}
                            belowMinimum={belowMinimum}
                            codec={settings.codec}
                            status={status}
                            estimating={estimating}
                            exporting={exporting}
                            progress={progress}
                            onExport={run}
                            onCancel={cancel}
                        />
                    </ControlsPanel>
                </>
            )}
        </div>
    )
}
