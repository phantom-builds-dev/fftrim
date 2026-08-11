const MIME: Record<string, string> = {
    mp4: 'video/mp4',
    m4v: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
    mkv: 'video/x-matroska',
    avi: 'video/x-msvideo',
    wmv: 'video/x-ms-wmv',
    flv: 'video/x-flv'
}

export function mimeForPath(path: string): string {
    const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase()
    return MIME[ext] ?? 'application/octet-stream'
}

export interface RangeResponse {
    status: 200 | 206 | 416
    start: number
    end: number
    headers: Record<string, string>
}

export function computeRange(
    total: number,
    contentType: string,
    rangeHeader: string | null
): RangeResponse {
    if (!rangeHeader) {
        return {
            status: 200,
            start: 0,
            end: total - 1,
            headers: {
                'Content-Type': contentType,
                'Content-Length': String(total),
                'Accept-Ranges': 'bytes'
            }
        }
    }

    const m = /bytes=(\d*)-(\d*)/.exec(rangeHeader)
    if (!m || (m[1] === '' && m[2] === '')) {
        return { status: 416, start: 0, end: -1, headers: { 'Content-Range': `bytes */${total}` } }
    }

    let start: number
    let end: number
    if (m[1] === '') {
        start = total - Number(m[2])
        end = total - 1
    } else {
        start = Number(m[1])
        end = m[2] === '' ? total - 1 : Number(m[2])
    }
    if (start < 0) start = 0
    if (end > total - 1) end = total - 1
    if (start > end || start >= total) {
        return { status: 416, start: 0, end: -1, headers: { 'Content-Range': `bytes */${total}` } }
    }

    const chunk = end - start + 1
    return {
        status: 206,
        start,
        end,
        headers: {
            'Content-Type': contentType,
            'Content-Length': String(chunk),
            'Content-Range': `bytes ${start}-${end}/${total}`,
            'Accept-Ranges': 'bytes'
        }
    }
}
