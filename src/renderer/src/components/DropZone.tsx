import type { JSX } from 'react'
import { FilmStripIcon as FilmStrip } from '@phosphor-icons/react'

interface Props {
    onOpen: () => void
    error?: string | null
}

export default function DropZone({ onOpen, error }: Props): JSX.Element {
    return (
        <div className="dropzone" onClick={onOpen}>
            <div className="drop-inner">
                <FilmStrip size={46} weight="thin" className="drop-icon" />
                <div>Drop a video here, or click to open</div>
                {error && <div className="drop-error">{error}</div>}
            </div>
        </div>
    )
}
