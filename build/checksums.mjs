import { createHash } from 'crypto'
import { createReadStream } from 'fs'
import { readdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { pipeline } from 'stream/promises'

const DIST = 'dist'
const OUTPUT = join(DIST, 'SHA256SUMS.txt')
const ARTIFACT = /\.(exe|AppImage|zip|msi|deb)$/

async function sha256(filePath) {
    const hash = createHash('sha256')
    await pipeline(createReadStream(filePath), hash)
    return hash.digest('hex')
}

const entries = await readdir(DIST, { withFileTypes: true })
const artifacts = entries
    .filter((e) => e.isFile() && ARTIFACT.test(e.name))
    .map((e) => e.name)
    .sort()

if (artifacts.length === 0) {
    console.error(`No release artifacts in ${DIST}/ — run a build first.`)
    process.exit(1)
}

// Two spaces between hash and name is the sha256sum format, so the file works
// with `sha256sum -c` unmodified.
const lines = []
for (const name of artifacts) {
    const digest = await sha256(join(DIST, name))
    lines.push(`${digest}  ${name}`)
    console.log(`${digest}  ${name}`)
}

await writeFile(OUTPUT, lines.join('\n') + '\n', 'utf8')
console.log(`\nWrote ${OUTPUT}`)
