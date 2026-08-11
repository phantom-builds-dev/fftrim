import type { MediaInfo } from '@shared/types'
import { ffprobePath } from './paths'
import { run } from './process'

interface ProbeStream {
    codec_type?: string
    codec_name?: string
    width?: number
    height?: number
    duration?: string
    avg_frame_rate?: string
    r_frame_rate?: string
    disposition?: { attached_pic?: number }
    tags?: { rotate?: string }
    side_data_list?: Array<{ rotation?: number }>
}

interface ProbeOutput {
    streams?: ProbeStream[]
    format?: { duration?: string; size?: string }
}

const DEFAULT_FPS = 30

function toFinite(value: string | undefined, fallback: number): number {
    const n = parseFloat(value ?? '')
    return Number.isFinite(n) ? n : fallback
}

/** ffprobe reports frame rates as a rational string, e.g. "30000/1001". */
function parseRational(value: string | undefined): number {
    const [num, den] = (value ?? '').split('/')
    const n = parseFloat(num)
    const d = den === undefined ? 1 : parseFloat(den)
    if (!Number.isFinite(n) || !Number.isFinite(d) || n <= 0 || d === 0) return 0
    return n / d
}

/**
 * Rotation sits in the Display Matrix side data on modern files and in a
 * `rotate` tag on older ones. Normalised to 0/90/180/270; the sign says which
 * way round it is, which does not matter for swapping dimensions.
 */
function rotationOf(stream: ProbeStream): number {
    const side = stream.side_data_list?.find((s) => typeof s.rotation === 'number')?.rotation
    const raw = side ?? toFinite(stream.tags?.rotate, 0)
    return ((Math.round(raw) % 360) + 360) % 360
}

/**
 * Reshapes ffprobe's output into the description of a file the rest of the app
 * works from.
 *
 * Dimensions are as displayed rather than as coded: ffmpeg auto-rotates on
 * decode and the `<video>` preview honours the same metadata, so a portrait clip
 * stored landscape has to be described as portrait. The frame rate prefers
 * `avg_frame_rate`, since on variable frame rate sources `r_frame_rate` can be a
 * huge timebase-derived number rather than a real rate.
 */
export function toMediaInfo(data: ProbeOutput, input: string): MediaInfo {
    const streams = data.streams ?? []
    // Cover art on an audio file is a video stream by ffprobe's reckoning, and
    // the open dialog will hand over anything if the user asks for all files.
    const video = streams.find((s) => s.codec_type === 'video' && !s.disposition?.attached_pic)
    const audio = streams.find((s) => s.codec_type === 'audio')
    if (!video) throw new Error('No video stream found in this file.')

    const durationSec = toFinite(data.format?.duration, toFinite(video.duration, 0))
    if (durationSec <= 0) {
        throw new Error('Could not determine the duration of this file.')
    }

    const rotation = rotationOf(video)
    const swap = rotation === 90 || rotation === 270
    const codedWidth = video.width ?? 0
    const codedHeight = video.height ?? 0

    const fps =
        parseRational(video.avg_frame_rate) || parseRational(video.r_frame_rate) || DEFAULT_FPS

    return {
        path: input,
        durationSec,
        width: swap ? codedHeight : codedWidth,
        height: swap ? codedWidth : codedHeight,
        fps,
        videoCodec: video.codec_name ?? 'unknown',
        audioCodec: audio?.codec_name ?? null,
        hasAudio: Boolean(audio),
        sizeBytes: parseInt(data.format?.size ?? '0', 10)
    }
}

/**
 * `-v error` rather than quiet: errors go to stderr and leave stdout clean JSON,
 * and a probe that fails silently leaves both the log and userMessage with
 * nothing to say about why the file was refused.
 */
export async function probe(input: string): Promise<MediaInfo> {
    // prettier-ignore
    const out = await run(ffprobePath, [
        '-v', 'error',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        input
    ])

    let data: ProbeOutput
    try {
        data = JSON.parse(out) as ProbeOutput
    } catch {
        throw new Error('The details of this file could not be read.')
    }
    return toMediaInfo(data, input)
}
