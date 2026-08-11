import { ipcMain } from 'electron'
import type { PlanArgs } from '@shared/types'
import { CH } from '@shared/channels'
import { probe, resolvePlan } from '../ffmpeg'
import { isReadAllowed } from '../media/access'
import { acceptDroppedSource } from '../media/open'
import { userMessage } from '../errors'

/**
 * A dropped file never passes through the open dialog, so nothing has granted it
 * read access yet: probing and the media protocol both refuse it until it has
 * been accepted. Planning carries the same guard, since it samples the source
 * with ffmpeg rather than working from what it was handed.
 */
export function registerMediaIpc(): void {
    ipcMain.handle(CH.mediaAcceptDrop, (_e, input: string) => {
        if (!acceptDroppedSource(input)) {
            throw new Error('That file is not a video this app can open.')
        }
    })

    ipcMain.handle(CH.mediaProbe, async (_e, input: string) => {
        if (!isReadAllowed(input)) throw new Error('This file has not been opened by the user.')
        try {
            return await probe(input)
        } catch (err) {
            throw new Error(userMessage(err))
        }
    })

    ipcMain.handle(CH.mediaPlan, (_e, args: PlanArgs) => {
        if (!isReadAllowed(args.info.path)) {
            throw new Error('This file has not been opened by the user.')
        }
        return resolvePlan(args.info, args.start, args.end, args.targetBytes, args.codec, args.mute)
    })
}
