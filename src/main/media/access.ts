import { resolve } from 'path'

const readable = new Set<string>()
const writable = new Set<string>()

function key(filePath: string): string {
    return resolve(filePath)
}

export function allowRead(filePath: string): void {
    readable.add(key(filePath))
}

export function isReadAllowed(filePath: string): boolean {
    return readable.has(key(filePath))
}

export function allowWrite(filePath: string): void {
    writable.add(key(filePath))
}

export function isWriteAllowed(filePath: string): boolean {
    return writable.has(key(filePath))
}
