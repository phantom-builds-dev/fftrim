import { describe, it, expect } from 'vitest'
import { toMediaInfo } from './probe'

interface StreamLike {
    codec_type: string
    codec_name?: string
    width?: number
    height?: number
    avg_frame_rate?: string
    r_frame_rate?: string
    disposition?: { attached_pic?: number }
    tags?: { rotate?: string }
    side_data_list?: Array<{ rotation?: number }>
}

interface OutputLike {
    streams: StreamLike[]
    format: { duration?: string; size?: string }
}

function output(video: Partial<StreamLike> = {}, extraStreams: StreamLike[] = []): OutputLike {
    return {
        streams: [
            {
                codec_type: 'video',
                codec_name: 'h264',
                width: 1920,
                height: 1080,
                avg_frame_rate: '30/1',
                r_frame_rate: '30/1',
                ...video
            },
            ...extraStreams
        ],
        format: { duration: '60', size: '10485760' }
    }
}

describe('toMediaInfo', () => {
    it('reports coded dimensions when there is no rotation', () => {
        const info = toMediaInfo(output(), 'C:\\clips\\in.mp4')
        expect([info.width, info.height]).toEqual([1920, 1080])
    })

    it('swaps dimensions for a 90 degree display matrix', () => {
        const info = toMediaInfo(output({ side_data_list: [{ rotation: -90 }] }), 'in.mp4')
        expect([info.width, info.height]).toEqual([1080, 1920])
    })

    it('swaps dimensions for a 270 degree rotation either way round', () => {
        expect(toMediaInfo(output({ side_data_list: [{ rotation: 270 }] }), 'a').height).toBe(1920)
        expect(toMediaInfo(output({ side_data_list: [{ rotation: -270 }] }), 'a').height).toBe(1920)
    })

    it('leaves dimensions alone for a 180 degree rotation', () => {
        const info = toMediaInfo(output({ side_data_list: [{ rotation: 180 }] }), 'a')
        expect([info.width, info.height]).toEqual([1920, 1080])
    })

    it('reads the legacy rotate tag when there is no side data', () => {
        const info = toMediaInfo(output({ tags: { rotate: '90' } }), 'a')
        expect([info.width, info.height]).toEqual([1080, 1920])
    })

    it('prefers side data over the legacy tag', () => {
        const info = toMediaInfo(
            output({ side_data_list: [{ rotation: 0 }], tags: { rotate: '90' } }),
            'a'
        )
        expect([info.width, info.height]).toEqual([1920, 1080])
    })

    it('parses a fractional frame rate', () => {
        expect(toMediaInfo(output({ avg_frame_rate: '30000/1001' }), 'a').fps).toBeCloseTo(29.97, 2)
    })

    it('falls back past an unusable avg_frame_rate', () => {
        expect(toMediaInfo(output({ avg_frame_rate: '0/0' }), 'a').fps).toBe(30)
        expect(toMediaInfo(output({ avg_frame_rate: '0/0', r_frame_rate: '60/1' }), 'a').fps).toBe(
            60
        )
        expect(
            toMediaInfo(output({ avg_frame_rate: undefined, r_frame_rate: undefined }), 'a').fps
        ).toBe(30)
    })

    it('detects an audio track', () => {
        expect(toMediaInfo(output(), 'a').hasAudio).toBe(false)
        const withAudio = toMediaInfo(output({}, [{ codec_type: 'audio', codec_name: 'aac' }]), 'a')
        expect(withAudio.hasAudio).toBe(true)
        expect(withAudio.audioCodec).toBe('aac')
    })

    it('rejects a file with no video stream or no duration', () => {
        expect(() => toMediaInfo({ streams: [], format: { duration: '60' } }, 'a')).toThrow(
            /no video stream/i
        )
        expect(() => toMediaInfo({ ...output(), format: {} }, 'a')).toThrow(/duration/i)
    })

    it('rejects cover art on an audio file rather than treating it as video', () => {
        const coverArt: StreamLike = {
            codec_type: 'video',
            codec_name: 'mjpeg',
            width: 600,
            height: 600,
            disposition: { attached_pic: 1 }
        }
        expect(() =>
            toMediaInfo(
                {
                    streams: [coverArt, { codec_type: 'audio', codec_name: 'mp3' }],
                    format: { duration: '180' }
                },
                'a'
            )
        ).toThrow(/no video stream/i)
    })

    it('picks the real video stream past an attached picture', () => {
        const info = toMediaInfo(
            {
                streams: [
                    {
                        codec_type: 'video',
                        codec_name: 'mjpeg',
                        width: 600,
                        height: 600,
                        disposition: { attached_pic: 1 }
                    },
                    ...output().streams
                ],
                format: { duration: '60' }
            },
            'a'
        )
        expect(info.videoCodec).toBe('h264')
        expect([info.width, info.height]).toEqual([1920, 1080])
    })
})
