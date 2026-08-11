import { useCallback, useEffect, useState } from 'react'
import type { MediaInfo } from '@shared/types'

export interface MediaFile {
    info: MediaInfo | null
    mediaUrl: string | null
    error: string | null
    previewFailed: boolean
    onPreviewError: () => void
    open: () => Promise<void>
}

/**
 * the only place a file path enters the renderer. The dialog and
 * drag and drop features go through "load".
 */
export function useMediaFile(): MediaFile {
    const [info, setInfo] = useState<MediaInfo | null>(null)
    const [mediaUrl, setMediaUrl] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [previewFailed, setPreviewFailed] = useState(false)

    const fail = useCallback((err: unknown) => {
        setInfo(null)
        setMediaUrl(null)
        setPreviewFailed(false)
        setError(err instanceof Error ? err.message : String(err))
    }, [])

    const load = useCallback(
        async (path: string) => {
            try {
                const meta = await window.api.probe(path)
                setInfo(meta)
                setMediaUrl(window.api.mediaUrl(path))
                setPreviewFailed(false)
                setError(null)
            } catch (err) {
                fail(err)
            }
        },
        [fail]
    )

    /**
     * A drop bypasses the open dialog, so main has granted nothing yet.
     * Probing and the media protocol would both refuse the path until it is accepted.
     */
    const loadDropped = useCallback(
        async (path: string) => {
            try {
                await window.api.acceptDrop(path)
            } catch (err) {
                fail(err)
                return
            }
            await load(path)
        },
        [fail, load]
    )

    const open = useCallback(async () => {
        let path: string | null
        try {
            path = await window.api.openFile()
        } catch (err) {
            fail(err)
            return
        }
        if (path) await load(path)
    }, [fail, load])

    /**
     * ffmpeg reads far more than the preview element can play: an H.265 mp4 or
     * anything in an avi or wmv usually probes cleanly and then decodes to
     * nothing. Trimming and export are unaffected, so this is a note instead of
     * a failure to load.
     */
    const onPreviewError = useCallback(() => setPreviewFailed(true), [])

    useEffect(() => {
        const onDrop = (e: DragEvent): void => {
            e.preventDefault()
            const file = e.dataTransfer?.files?.[0]
            if (!file) return
            const path = window.api.pathForFile(file)
            if (path) void loadDropped(path)
        }
        const onDragOver = (e: DragEvent): void => e.preventDefault()

        window.addEventListener('drop', onDrop)
        window.addEventListener('dragover', onDragOver)
        return () => {
            window.removeEventListener('drop', onDrop)
            window.removeEventListener('dragover', onDragOver)
        }
    }, [loadDropped])

    return { info, mediaUrl, error, previewFailed, onPreviewError, open }
}
