export const MEDIA_SCHEME = 'media'

/** Container extensions the open dialog offers and a drop is allowed to carry. */
export const VIDEO_EXTENSIONS = ['mp4', 'mov', 'mkv', 'avi', 'webm', 'm4v', 'wmv', 'flv']

export function mediaUrlFor(filePath: string): string {
    return `${MEDIA_SCHEME}://f/${encodeURIComponent(filePath)}`
}
