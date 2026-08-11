export function formatTime(sec: number): string {
    if (!isFinite(sec) || sec < 0) sec = 0
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = Math.floor(sec % 60)
    const d = Math.floor((sec % 1) * 10)
    const mm = String(m).padStart(h > 0 ? 2 : 1, '0')
    const ss = String(s).padStart(2, '0')
    return h > 0 ? `${h}:${mm}:${ss}.${d}` : `${mm}:${ss}.${d}`
}

export function parseTime(str: string): number | null {
    const trimmed = str.trim()
    if (trimmed === '') return null
    const parts = trimmed.split(':')
    if (parts.some((p) => p !== '' && isNaN(Number(p)))) return null
    let seconds = 0
    for (const part of parts) seconds = seconds * 60 + Number(part || 0)
    return isFinite(seconds) ? seconds : null
}

export function formatBytes(n: number): string {
    if (!isFinite(n) || n <= 0) return '0 MB'
    const mb = n / (1024 * 1024)
    if (mb < 1) return `${(n / 1024).toFixed(0)} KB`
    if (mb < 100) return `${mb.toFixed(1)} MB`
    return `${mb.toFixed(0)} MB`
}
