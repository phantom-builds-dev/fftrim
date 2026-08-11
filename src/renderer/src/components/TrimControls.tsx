import type { JSX } from 'react'
import TimePill from './Timepill'
import { formatTime } from '../lib/format'

interface Props {
    start: number
    end: number
    currentTime: number
    trimDuration: number
    onChangeStart: (t: number) => void
    onChangeEnd: (t: number) => void
}

export default function TrimControls({
    start,
    end,
    currentTime,
    trimDuration,
    onChangeStart,
    onChangeEnd
}: Props): JSX.Element {
    return (
        <div className="ctrl-row">
            <span className="ctrl-label">Trim</span>
            <div className="ctrl-body trim-body">
                <TimePill
                    label="Start"
                    value={start}
                    onCommit={onChangeStart}
                    onSet={() => onChangeStart(currentTime)}
                    setTitle="Set start to playhead (I)"
                />
                <TimePill
                    label="End"
                    value={end}
                    onCommit={onChangeEnd}
                    onSet={() => onChangeEnd(currentTime)}
                    setTitle="Set end to playhead (O)"
                />
                <div className="trim-duration">
                    <span className="ctrl-label">Length</span>
                    <span className="mono">{formatTime(trimDuration)}</span>
                </div>
            </div>
        </div>
    )
}
