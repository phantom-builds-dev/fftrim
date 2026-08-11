import type { JSX } from 'react'
import {
    PlayIcon as Play,
    PauseIcon as Pause,
    ArrowCounterClockwiseIcon as ArrowCounterClockwise,
    ArrowClockwiseIcon as ArrowClockwise,
    CaretDownIcon as CaretDown,
    CaretUpIcon as CaretUp
} from '@phosphor-icons/react'
import Timeline from './Timeline'
import { MIN_TRIM } from '../hooks/useTrim'
import { SKIP_SECONDS } from '../hooks/usePlayback'
import { formatTime } from '../lib/format'

interface Props {
    duration: number
    start: number
    end: number
    currentTime: number
    playing: boolean
    collapsed: boolean
    canCollapse: boolean
    onChangeStart: (t: number) => void
    onChangeEnd: (t: number) => void
    onSeek: (t: number) => void
    onSkip: (delta: number) => void
    onTogglePlay: () => void
    onToggleCollapsed: () => void
}

export default function Transport({
    duration,
    start,
    end,
    currentTime,
    playing,
    collapsed,
    canCollapse,
    onChangeStart,
    onChangeEnd,
    onSeek,
    onSkip,
    onTogglePlay,
    onToggleCollapsed
}: Props): JSX.Element {
    return (
        <div className="transport">
            <div className="transport-controls">
                <button
                    className="skip-btn"
                    onClick={() => onSkip(-SKIP_SECONDS)}
                    title={`Back ${SKIP_SECONDS} seconds (Left arrow)`}
                >
                    <ArrowCounterClockwise size={26} weight="bold" />
                    <span className="skip-label mono">{SKIP_SECONDS}</span>
                </button>

                <button
                    className="transport-btn"
                    onClick={onTogglePlay}
                    title="Play / Pause (Space)"
                >
                    {playing ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
                </button>

                <button
                    className="skip-btn"
                    onClick={() => onSkip(SKIP_SECONDS)}
                    title={`Forward ${SKIP_SECONDS} seconds (Right arrow)`}
                >
                    <ArrowClockwise size={26} weight="bold" />
                    <span className="skip-label mono">{SKIP_SECONDS}</span>
                </button>
            </div>

            <Timeline
                duration={duration}
                start={start}
                end={end}
                currentTime={currentTime}
                minGap={MIN_TRIM}
                onChangeStart={onChangeStart}
                onChangeEnd={onChangeEnd}
                onSeek={onSeek}
            />
            <div className="time-readout mono">
                <span className="tr-cur">{formatTime(currentTime)}</span>
                <span className="tr-total"> / {formatTime(duration)}</span>
            </div>

            <button
                className="collapse-btn"
                onClick={onToggleCollapsed}
                disabled={!canCollapse}
                title={
                    canCollapse
                        ? `${collapsed ? 'Show' : 'Hide'} controls (F)`
                        : 'Controls stay open while exporting'
                }
            >
                {collapsed ? (
                    <CaretUp size={16} weight="bold" />
                ) : (
                    <CaretDown size={16} weight="bold" />
                )}
            </button>
        </div>
    )
}
