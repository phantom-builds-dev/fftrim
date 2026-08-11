import type { JSX } from 'react'
import { WarningIcon as Warning } from '@phosphor-icons/react'
import type { VideoBindings } from '../hooks/usePlayback'

interface Props {
    src: string
    muted: boolean
    videoProps: VideoBindings
    failed: boolean
    codec: string
    onTogglePlay: () => void
    onError: () => void
}

export default function Preview({
    src,
    muted,
    videoProps,
    failed,
    codec,
    onTogglePlay,
    onError
}: Props): JSX.Element {
    return (
        <div className="preview-wrap">
            <video
                className="preview"
                src={src}
                muted={muted}
                onClick={onTogglePlay}
                {...videoProps}
                onError={onError}
            />
            {failed && (
                <div className="preview-notice">
                    <Warning size={30} weight="thin" />
                    <div className="preview-notice-title">
                        {codec.toUpperCase()} cannot be played back here
                    </div>
                    <div className="preview-notice-body">
                        Set the trim points from the timeline. The export reads this file with
                        ffmpeg and is unaffected.
                    </div>
                </div>
            )}
        </div>
    )
}
