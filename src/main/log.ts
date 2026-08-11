import log from 'electron-log/main'

log.transports.file.level = 'info'
log.transports.file.maxSize = 2 * 1024 * 1024
log.transports.console.level = 'debug'

export function logFilePath(): string {
    return log.transports.file.getFile().path
}

export function installCrashHandlers(): void {
    process.on('uncaughtException', (err) => log.error('uncaughtException', err))
    process.on('unhandledRejection', (reason) => log.error('unhandledRejection', reason))
}

export { log }
