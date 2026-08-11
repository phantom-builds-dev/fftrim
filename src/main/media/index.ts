import { protocol } from 'electron'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { Readable } from 'stream'
import { MEDIA_SCHEME } from '@shared/media'
import { computeRange, mimeForPath } from './range'
import { isReadAllowed } from './access'

export function registerMediaScheme(): void {
    protocol.registerSchemesAsPrivileged([
        {
            scheme: MEDIA_SCHEME,
            privileges: {
                standard: true,
                secure: true,
                supportFetchAPI: true,
                stream: true,
                bypassCSP: true
            }
        }
    ])
}

export function registerMediaProtocol(): void {
    protocol.handle(MEDIA_SCHEME, async (request) => {
        let filePath: string
        try {
            filePath = decodeURIComponent(new URL(request.url).pathname.replace(/^\//, ''))
        } catch {
            return new Response('Bad request', { status: 400 })
        }

        if (!isReadAllowed(filePath)) {
            return new Response('Forbidden', { status: 403 })
        }

        let total: number
        try {
            const s = await stat(filePath)
            if (!s.isFile()) return new Response('Not found', { status: 404 })
            total = s.size
        } catch {
            return new Response('Not found', { status: 404 })
        }

        const r = computeRange(total, mimeForPath(filePath), request.headers.get('Range'))
        if (r.status === 416) {
            return new Response(null, { status: 416, headers: r.headers })
        }

        const stream = createReadStream(filePath, { start: r.start, end: r.end })
        return new Response(Readable.toWeb(stream) as unknown as ReadableStream, {
            status: r.status,
            headers: r.headers
        })
    })
}
