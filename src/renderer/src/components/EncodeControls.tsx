import type { JSX } from 'react'
import { useState } from 'react'
import { InfoIcon as Info, CheckIcon as Check } from '@phosphor-icons/react'
import type { Codec } from '@shared/types'

interface Props {
    codec: Codec
    onChangeCodec: (c: Codec) => void
    mute: boolean
    onChangeMute: (m: boolean) => void
}

export default function EncodeControls({
    codec,
    onChangeCodec,
    mute,
    onChangeMute
}: Props): JSX.Element {
    const [showInfo, setShowInfo] = useState(false)

    return (
        <div className="ctrl-row">
            <span className="ctrl-label">Encode</span>
            <div className="ctrl-body encode-body">
                <div className="segmented">
                    <button
                        className={codec === 'h264' ? 'seg active' : 'seg'}
                        onClick={() => onChangeCodec('h264')}
                    >
                        H.264
                    </button>
                    <button
                        className={codec === 'h265' ? 'seg active' : 'seg'}
                        onClick={() => onChangeCodec('h265')}
                    >
                        H.265
                    </button>
                </div>

                <div
                    className="info-wrap"
                    onMouseEnter={() => setShowInfo(true)}
                    onMouseLeave={() => setShowInfo(false)}
                >
                    <Info size={18} className="info-icon" />
                    {showInfo && (
                        <div className="info-pop">
                            <div className="info-title">Which encoder?</div>
                            <div className="info-text">
                                <b>H.264</b>: plays on virtually any device and app. Safest for
                                sharing.
                                <br />
                                <br />
                                <b>H.265 (HEVC)</b>: roughly 30-50% smaller at the same quality, but
                                needs a newer device to play back.
                            </div>
                            <div className="info-arrow" />
                        </div>
                    )}
                </div>

                <button
                    className={`mute-check ${mute ? 'on' : ''}`}
                    onClick={() => onChangeMute(!mute)}
                >
                    <span className="mute-box">
                        <Check size={12} weight="bold" />
                    </span>
                    Mute audio
                </button>
            </div>
        </div>
    )
}
