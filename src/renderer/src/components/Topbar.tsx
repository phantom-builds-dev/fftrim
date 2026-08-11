import type { JSX } from 'react'
import { FolderOpenIcon as FolderOpen, FilmStripIcon as FilmStrip } from '@phosphor-icons/react'
import type { MediaInfo } from '@shared/types'
import { formatBytes, formatTime } from '../lib/format'

interface Props {
    info: MediaInfo
    onOpen: () => void
}

export default function Topbar({ info, onOpen }: Props): JSX.Element {
    return (
        <header className="topbar">
            <button className="open-btn" onClick={onOpen}>
                <FolderOpen size={16} weight="bold" className="open-icon" />
                Open File
            </button>
            <div className="file-meta">
                <span className="fm-name">
                    <FilmStrip size={15} weight="fill" className="fm-icon" />
                    {info.path.split(/[\\/]/).pop()}
                </span>
                <span className="fm-dot">•</span>
                <span className="mono">
                    {info.width}×{info.height}
                </span>
                <span className="fm-dot">•</span>
                <span className="mono">{formatTime(info.durationSec)}</span>
                <span className="fm-dot">•</span>
                <span>{info.videoCodec.toUpperCase()}</span>
                <span className="fm-dot">•</span>
                <span className="mono">{formatBytes(info.sizeBytes)}</span>
            </div>
        </header>
    )
}
