import ffmpegStatic from 'ffmpeg-static'
import ffprobeInstaller from '@ffprobe-installer/ffprobe'

/**
 * Absolute paths to the bundled binaries. In a packaged build they sit in
 * app.asar.unpacked, since an executable cannot be run from inside an archive,
 * see `asarUnpack` in electron-builder.yml.
 */
export const ffmpegPath = (ffmpegStatic as unknown as string).replace(
    'app.asar',
    'app.asar.unpacked'
)
export const ffprobePath = ffprobeInstaller.path.replace('app.asar', 'app.asar.unpacked')

export const nullSink = process.platform === 'win32' ? 'NUL' : '/dev/null'
