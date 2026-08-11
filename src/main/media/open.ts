import { statSync } from 'fs'
import { dirname, extname } from 'path'
import { VIDEO_EXTENSIONS } from '@shared/media'
import { allowRead } from './access'

let sourceDir: string | null = null

/**
 * The single point where a source video becomes readable, so the read grant and
 * the remembered folder cannot drift apart between the two ways in.
 */
export function acceptSource(filePath: string): void {
    allowRead(filePath)
    sourceDir = dirname(filePath)
}

/**
 * The folder the last source came from, held for this run of the app only: it is
 * where the next open dialog starts, which helps within a sitting and misleads
 * across them, since the next video may live anywhere.
 */
export function lastSourceDir(): string | null {
    return sourceDir
}

function isVideoPath(filePath: string): boolean {
    const ext = extname(filePath).slice(1).toLowerCase()
    return VIDEO_EXTENSIONS.includes(ext)
}

function isFile(filePath: string): boolean {
    try {
        return statSync(filePath).isFile()
    } catch {
        return false
    }
}

/**
 * A drop hands main a path the renderer chose rather than one a dialog returned,
 * so it is checked before it is trusted: an existing regular file with a
 * container extension the app can open.
 */
export function acceptDroppedSource(filePath: string): boolean {
    if (!isVideoPath(filePath) || !isFile(filePath)) return false
    acceptSource(filePath)
    return true
}
