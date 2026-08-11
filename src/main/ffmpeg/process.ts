import { spawn, ChildProcess } from 'child_process'
import { basename } from 'path'
import { log } from '../log'
import { ffmpegPath } from './paths'

export type ProgressCb = (fraction: number) => void

/**
 * A non-zero exit from ffmpeg or ffprobe. The stderr behind it goes to the log
 * file only; see userMessage for what the UI is given.
 */
export class FfmpegError extends Error {
    constructor(
        readonly code: number | null,
        readonly bin: string,
        readonly stderr: string = ''
    ) {
        super(`${bin} exited with code ${code}`)
        this.name = 'FfmpegError'
    }
}

/** Kept apart from a plain failure so a caller can back off rather than retry. */
export class TimeoutError extends Error {
    constructor(readonly bin: string) {
        super(`${bin} timed out`)
        this.name = 'TimeoutError'
    }
}

/**
 * An export the user stopped. Carried on the rejection rather than read from the
 * cancelled flag afterwards: the flag belongs to one export and says nothing
 * about which failure is being looked at, and a stale one silences a real error.
 */
export class CancelledError extends Error {
    constructor() {
        super('Export cancelled.')
        this.name = 'CancelledError'
    }
}

/**
 * Every child a cancel is allowed to kill. The export's own encodes are here,
 * and so are the sample encodes behind an estimate: without them a cancel during
 * the measuring phase would kill nothing and appear to hang.
 */
const children = new Set<ChildProcess>()
let cancelled = false

export function cancel(): void {
    cancelled = true
    for (const child of children) child.kill('SIGKILL')
    children.clear()
}

export function resetCancel(): void {
    cancelled = false
}

export function isCancelled(): boolean {
    return cancelled
}

const STDERR_CAP = 8192
const PROBE_TIMEOUT_MS = 30_000

/**
 * Runs ffmpeg, reporting progress as a fraction of durationSec.
 *
 * `cwd` is where any file the encoder names for itself lands, which matters for
 * the two-pass stats, see twoPassEncode. Everything the app names is absolute.
 */
export function runFfmpeg(
    args: string[],
    durationSec: number,
    onProgress: ProgressCb,
    cwd?: string
): Promise<void> {
    return new Promise((resolve, reject) => {
        if (cancelled) {
            reject(new CancelledError())
            return
        }

        log.info('ffmpeg', args.join(' '))
        // prettier-ignore
        const child = spawn(ffmpegPath, ['-hide_banner', '-nostdin', '-progress', 'pipe:1', ...args], { cwd })
        children.add(child)

        let stderr = ''
        child.stderr.on('data', (chunk: Buffer) => {
            stderr = (stderr + chunk.toString()).slice(-STDERR_CAP)
        })

        let stdout = ''
        child.stdout.on('data', (chunk: Buffer) => {
            stdout += chunk.toString()
            const lines = stdout.split('\n')
            stdout = lines.pop() ?? ''
            for (const line of lines) {
                const [key, value] = line.split('=')
                if (key === 'out_time_us' && value !== 'N/A') {
                    const secs = Number(value) / 1_000_000
                    if (Number.isFinite(secs)) onProgress(Math.min(1, secs / durationSec))
                }
            }
        })

        let startFailed = false
        child.on('error', (err) => {
            children.delete(child)
            startFailed = true
            log.error('ffmpeg failed to start', err)
            reject(err)
        })
        child.on('close', (code) => {
            children.delete(child)
            if (startFailed) return
            if (cancelled) reject(new CancelledError())
            else if (code === 0) {
                onProgress(1)
                resolve()
            } else {
                log.error(`ffmpeg exited with code ${code}\n${stderr}`)
                reject(new FfmpegError(code, 'ffmpeg', stderr))
            }
        })
    })
}

interface RunOptions {
    timeoutMs?: number
    /**
     * Whether a cancel may kill this run. Set for the sample encodes an estimate
     * runs; left off for a probe, which belongs to loading a file rather than to
     * the export being cancelled. The cancelled flag itself is not consulted: it
     * stays raised until the next export resets it, and a run started after a
     * cancel is a new request rather than part of the abandoned one.
     */
    cancellable?: boolean
}

export function run(bin: string, args: string[], opts: RunOptions = {}): Promise<string> {
    const { timeoutMs = PROBE_TIMEOUT_MS, cancellable = false } = opts

    return new Promise((resolve, reject) => {
        const child = spawn(bin, args)
        if (cancellable) children.add(child)

        let stdout = ''
        let stderr = ''
        let settled = false

        const finish = (fn: () => void): void => {
            if (settled) return
            settled = true
            clearTimeout(timer)
            children.delete(child)
            fn()
        }

        const timer = setTimeout(() => {
            child.kill('SIGKILL')
            finish(() => reject(new TimeoutError(basename(bin))))
        }, timeoutMs)

        child.stdout.on('data', (c: Buffer) => (stdout += c.toString()))
        child.stderr.on('data', (c: Buffer) => (stderr += c.toString()))
        child.on('error', (err) => finish(() => reject(err)))
        child.on('close', (code) => {
            finish(() => {
                if (code === 0) {
                    resolve(stdout)
                    return
                }
                const name = basename(bin)
                log.error(`${name} exited with code ${code}\n${stderr}`)
                reject(new FfmpegError(code, name, stderr))
            })
        })
    })
}
