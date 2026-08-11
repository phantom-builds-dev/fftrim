import { describe, it, expect } from 'vitest'
import { computeRange, mimeForPath } from './range'

const TOTAL = 1000
const TYPE = 'video/mp4'

describe('mimeForPath', () => {
    it('maps known extensions case-insensitively', () => {
        expect(mimeForPath('C:\\clips\\a.MP4')).toBe('video/mp4')
        expect(mimeForPath('/tmp/a.mkv')).toBe('video/x-matroska')
    })

    it('falls back for unknown extensions', () => {
        expect(mimeForPath('a.xyz')).toBe('application/octet-stream')
        expect(mimeForPath('noextension')).toBe('application/octet-stream')
    })
})

describe('computeRange', () => {
    it('serves the whole file when no Range header is sent', () => {
        const r = computeRange(TOTAL, TYPE, null)
        expect(r.status).toBe(200)
        expect([r.start, r.end]).toEqual([0, 999])
        expect(r.headers['Content-Length']).toBe('1000')
        expect(r.headers['Accept-Ranges']).toBe('bytes')
    })

    it('serves a closed range', () => {
        const r = computeRange(TOTAL, TYPE, 'bytes=100-199')
        expect(r.status).toBe(206)
        expect([r.start, r.end]).toEqual([100, 199])
        expect(r.headers['Content-Length']).toBe('100')
        expect(r.headers['Content-Range']).toBe('bytes 100-199/1000')
    })

    it('serves an open-ended range to the end of the file', () => {
        const r = computeRange(TOTAL, TYPE, 'bytes=900-')
        expect(r.status).toBe(206)
        expect([r.start, r.end]).toEqual([900, 999])
        expect(r.headers['Content-Length']).toBe('100')
    })

    it('serves a suffix range', () => {
        const r = computeRange(TOTAL, TYPE, 'bytes=-100')
        expect(r.status).toBe(206)
        expect([r.start, r.end]).toEqual([900, 999])
    })

    it('clamps a suffix range larger than the file', () => {
        const r = computeRange(TOTAL, TYPE, 'bytes=-5000')
        expect(r.status).toBe(206)
        expect([r.start, r.end]).toEqual([0, 999])
    })

    it('clamps an end past the last byte', () => {
        const r = computeRange(TOTAL, TYPE, 'bytes=500-5000')
        expect(r.status).toBe(206)
        expect([r.start, r.end]).toEqual([500, 999])
    })

    it('rejects a start past the end of the file', () => {
        const r = computeRange(TOTAL, TYPE, 'bytes=1000-')
        expect(r.status).toBe(416)
        expect(r.headers['Content-Range']).toBe('bytes */1000')
    })

    it('rejects a zero-length suffix range', () => {
        expect(computeRange(TOTAL, TYPE, 'bytes=-0').status).toBe(416)
    })

    it('rejects a malformed Range header', () => {
        expect(computeRange(TOTAL, TYPE, 'bytes=-').status).toBe(416)
        expect(computeRange(TOTAL, TYPE, 'pages=1-2').status).toBe(416)
    })
})
