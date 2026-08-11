import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

let dir = ''

vi.mock('electron', () => ({ app: { getPath: () => dir } }))
vi.mock('../log', () => ({ log: { warn: () => {} } }))

const { acceptSource, acceptDroppedSource, lastSourceDir } = await import('./open')
const { isReadAllowed } = await import('./access')

function makeFile(name: string): string {
    const path = join(dir, name)
    writeFileSync(path, 'not really a video')
    return path
}

beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'fftrim-open-'))
})

afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
})

describe('accepting a source file', () => {
    it('grants read access and remembers the folder it came from', () => {
        const path = makeFile('clip.mp4')
        expect(isReadAllowed(path)).toBe(false)

        acceptSource(path)

        expect(isReadAllowed(path)).toBe(true)
        expect(lastSourceDir()).toBe(dir)
    })

    it('accepts a dropped video whatever the case of its extension', () => {
        const path = makeFile('clip.MOV')
        expect(acceptDroppedSource(path)).toBe(true)
        expect(isReadAllowed(path)).toBe(true)
    })

    it('refuses a dropped path that is not a video, granting nothing', () => {
        const path = makeFile('notes.txt')
        expect(acceptDroppedSource(path)).toBe(false)
        expect(isReadAllowed(path)).toBe(false)
    })

    it('refuses a dropped path that is missing or is a directory', () => {
        const folder = join(dir, 'clips.mp4')
        mkdirSync(folder)

        expect(acceptDroppedSource(join(dir, 'gone.mp4'))).toBe(false)
        expect(acceptDroppedSource(folder)).toBe(false)
        expect(isReadAllowed(folder)).toBe(false)
    })
})
