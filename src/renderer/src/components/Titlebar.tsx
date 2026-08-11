import type { JSX } from 'react'
import {
    MinusIcon as Minus,
    SquareIcon as Square,
    CopySimpleIcon as CopySimple,
    XIcon as X
} from '@phosphor-icons/react'
import { useWindowState } from '../hooks/useWindowState'
import About from './About'
import logo from '../../../../resources/icon.png'

export default function Titlebar(): JSX.Element {
    const { maximized, minimize, toggleMaximize, close } = useWindowState()

    return (
        <div className="titlebar">
            <div className="tb-brand">
                <img className="tb-logo" src={logo} alt="" />
                <span className="tb-title">FFtrim</span>
                <span className="tb-version mono">{window.api.appVersion()}</span>
                <About />
            </div>
            <div className="tb-window">
                <button className="tb-win no-drag" onClick={minimize} title="Minimize">
                    <Minus size={14} />
                </button>
                <button
                    className="tb-win no-drag"
                    onClick={toggleMaximize}
                    title={maximized ? 'Restore' : 'Maximize'}
                >
                    {maximized ? <CopySimple size={12} /> : <Square size={11} />}
                </button>
                <button className="tb-win tb-close no-drag" onClick={close} title="Close">
                    <X size={14} />
                </button>
            </div>
        </div>
    )
}
