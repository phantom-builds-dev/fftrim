const path = require('path')

const EXT = { darwin: '.app', win32: '.exe', linux: '' }

exports.default = async function afterPack(context) {
    // @electron/fuses is ESM-only from v2, so it cannot be require()d from this
    // CommonJS hook.
    const { flipFuses, FuseVersion, FuseV1Options } = await import('@electron/fuses')
    const { electronPlatformName, appOutDir, packager } = context
    const name =
        electronPlatformName === 'linux'
            ? packager.executableName
            : packager.appInfo.productFilename

    await flipFuses(path.join(appOutDir, `${name}${EXT[electronPlatformName]}`), {
        version: FuseVersion.V1,
        resetAdHocDarwinSignature: electronPlatformName === 'darwin',
        [FuseV1Options.RunAsNode]: false,
        [FuseV1Options.EnableCookieEncryption]: true,
        [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
        [FuseV1Options.EnableNodeCliInspectArguments]: false,
        [FuseV1Options.OnlyLoadAppFromAsar]: true
    })
}
