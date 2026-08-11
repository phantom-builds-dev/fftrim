import type { JSX } from 'react'
import { useEffect, useRef, useState } from 'react'
import {
    InfoIcon as Info,
    GithubLogoIcon as GithubLogo,
    ScalesIcon as Scales,
    FileTextIcon as FileText
} from '@phosphor-icons/react'
import logo from '../../../../resources/icon.png'

const SOURCE_URL = 'https://github.com/phantom-builds-dev/fftrim'

/**
 * The licence, the absence of warranty and where the source lives have to reach
 * whoever ends up running the app, not only whoever reads the repository. The
 * two documents open in the system viewer from the copies installed alongside
 * the app, so the panel itself stays short.
 */
export default function About(): JSX.Element {
    const [open, setOpen] = useState(false)
    const wrap = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return

        const onPointerDown = (e: PointerEvent): void => {
            if (!wrap.current?.contains(e.target as Node)) setOpen(false)
        }
        const onKeyDown = (e: KeyboardEvent): void => {
            if (e.key === 'Escape') setOpen(false)
        }

        document.addEventListener('pointerdown', onPointerDown)
        document.addEventListener('keydown', onKeyDown)
        return () => {
            document.removeEventListener('pointerdown', onPointerDown)
            document.removeEventListener('keydown', onKeyDown)
        }
    }, [open])

    return (
        <div className="about-wrap" ref={wrap}>
            <button
                className={`about-btn no-drag ${open ? 'open' : ''}`}
                onClick={() => setOpen((v) => !v)}
                title="About FFtrim"
                aria-haspopup="dialog"
                aria-expanded={open}
            >
                <Info size={14} />
            </button>

            {open && (
                <div className="about-pop" role="dialog" aria-label="About FFtrim">
                    <div className="about-head">
                        <img className="about-logo" src={logo} alt="" />
                        <div className="about-name">
                            FFtrim
                            <span className="about-ver mono">{window.api.appVersion()}</span>
                        </div>
                    </div>

                    <p className="about-text">
                        Copyright © 2026 phantom-builds. Free software under the GNU General Public
                        License, version 3 or later. It comes with absolutely no warranty.
                    </p>

                    <p className="about-text">
                        FFmpeg and FFprobe ship with the app as separate executables, GPLv3 builds
                        from gyan.dev. The notices name their versions and the source each was built
                        from.
                    </p>

                    <div className="about-links">
                        <a className="link" href={SOURCE_URL}>
                            <GithubLogo size={13} weight="bold" />
                            Source code
                        </a>
                        <button className="link" onClick={() => window.api.openLicense('license')}>
                            <Scales size={13} weight="bold" />
                            Licence
                        </button>
                        <button className="link" onClick={() => window.api.openLicense('notices')}>
                            <FileText size={13} weight="bold" />
                            Third-party notices
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
