import { FfmpegError, TimeoutError } from './ffmpeg'

/**
 * Encoder failures with a cause worth naming. Everything else is a code and a
 * pointer to the log, since ffmpeg's own account of itself is thousands of lines
 * of encoder chatter. Matched against the tail of stderr, which is where ffmpeg
 * puts the line that actually stopped it.
 */
const KNOWN: Array<[RegExp, string]> = [
    [/no space left|enospc/i, 'The disk ran out of space part way through.'],
    [
        /permission denied|eacces|read-only file system/i,
        'The file could not be written there. Try saving somewhere else.'
    ],
    [
        /no such file or directory|enoent/i,
        'A file the export needed went missing while it was running.'
    ],
    [
        /invalid data found|moov atom not found|could not find codec/i,
        'This video could not be read. The file may be damaged or in a format ffmpeg cannot decode.'
    ]
]

function errorCode(err: unknown): string | undefined {
    return err instanceof Error ? (err as NodeJS.ErrnoException).code : undefined
}

/**
 * Turns anything thrown in main into a line the UI can show.
 */
export function userMessage(err: unknown): string {
    if (err instanceof TimeoutError) {
        return `${err.bin} stopped responding and was closed.`
    }
    if (err instanceof FfmpegError) {
        const known = KNOWN.find(([pattern]) => pattern.test(err.stderr))
        return (
            known?.[1] ??
            `${err.bin} error ${err.code}. Open the log for the full output and send it on.`
        )
    }
    // Every binary is spawned by absolute path, so this is a missing one.
    if (errorCode(err) === 'ENOENT') {
        return 'The bundled ffmpeg could not be started. The installation may be damaged.'
    }
    return err instanceof Error ? err.message : String(err)
}
