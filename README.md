# FFtrim

FFtrim is a Windows desktop app to trim a video's length and compress it to a target
file size. Electron + React + TypeScript, built with electron-vite. FFmpeg and
FFprobe are bundled via `ffmpeg-static` / `@ffprobe-installer/ffprobe`, so no
separate FFmpeg install is needed.

## AI disclosure

FFtrim was written with the help of Claude, Anthropic's AI model. That holds for
most of the codebase and especially for the ffmpeg logic. This resulted from
working with it rather than out of any prior expertise with ffmpeg on my part.

I am saying so for two reasons. The first is that this is not a prompt pasted
into a generator and shipped as is. The behaviour described below is behaviour I
asked for and ran against real files. Choices that looked obvious in earlier
iterations got rewritten because they produced bad output and did not survive
testing.

The second is the warning that comes with that. I studied computer science, so I
know what to look for in code even in a library i don't have experience with.
However, knowing what to look for is not the same as having seen all of it. I did
not write every line, and I would not claim to be able to reproduce all of this from
memory or to have validated every path through it. If any of it matters to you, read
it, a public GPLv3 source tree is exactly what lets you.

Keep your original videos. FFtrim refuses to write over its source file, but treat
that as a decision you can go and verify in the code rather than a promise from me.

## Downloading and installing

Go to the Releases page: https://github.com/phantom-builds-dev/fftrim/releases

Under the latest release, download `fftrim-<version>-setup.exe` (the 
`SHA256SUMS.txt` file next to it is for the verification step below, you don't need 
it to install). Run the installer and step through it. It will ask where to install 
and whether to add a desktop shortcut.

FFtrim isn't code signed, so Windows will most likely show a "Windows protected your 
PC" SmartScreen warning the first time you run the installer. That's expected for an 
unsigned app, nothing is wrong. Click "More info", then "Run anyway" to continue.

## Verifying a download

`fftrim-<version>-setup.exe` on the Releases page has a SHA256 hash shown next to 
it, computed by GitHub from the exact bytes you're about to download. Click the copy 
icon to get the full value, then paste it somewhere to compare with the value in 
`SHA256SUMS.txt` (also in the release) and they should match, which confirms the 
download wasn't corrupted or altered.

If you got the installer from somewhere other than the Releases page itself,
you can check it locally instead. Open PowerShell, navigate to the folder you
downloaded to, and run:

```powershell
Get-FileHash .\fftrim-1.0.0-setup.exe -Algorithm SHA256
```

Compare the result to the matching line in `SHA256SUMS.txt`, they
should match (upper- or lowercase doesn't matter). If you have `sha256sum`
available instead (Git Bash, WSL, ...), `sha256sum -c SHA256SUMS.txt` checks every
file in the release at once.

## Using the app

These shortcuts are active whenever a file is loaded and the focus is not in a
text field.

| Key       | Action                           |
| --------- | -------------------------------- |
| `Space`   | Play / pause                     |
| `←` / `→` | Back / forward 10 seconds        |
| `,` / `.` | Step one frame back / forward    |
| `I` / `O` | Set trim start / end to playhead |
| `F`       | Hide / show the controls panel   |
| `Enter`   | Export                           |

FFtrim remembers the target, the custom figure, the encoder and the folder you
last saved to, along with whether the controls panel was collapsed. It
deliberately forgets anything belonging to one clip: trim points, the mute
toggle, and the folder the source came from all start fresh.

## Reporting problems

Bugs and feature requests belong in
[GitHub Issues](https://github.com/phantom-builds-dev/fftrim/issues), a public
thread means the next person encountering the same issue can find it. Include the
source file's container and codec if the problem is with a specific video, the
'About' panel has the app version.

If you have found a security issue, anything that gets the app to read or write
outside the paths it was granted, mail <phantom-builds@protonmail.com> instead
of opening an issue, so it can be fixed before it's public.

## How an export is decided

The target size is a hard limit, and a target too small to be worth encoding is
refused outright. Presets are 10, 50, 100 and 500 MB, plus a custom figure in MB
and `None` for no size limit at all. Whatever target is chosen, 95% of it is
actually spent, so the result should always be smaller than the target.

The encoder is a choice as well: H.264 by default, H.265 where a smaller file
matters more than compatibility. Both encoders take a quality setting called CRF,
lower means less compression and a bigger file, higher means more compression and a
smaller file, but the CRF scales don't mean the same thing at the same number for
H.264 and H.265. Each gets its own figure for "compress this much and you won't be
able to tell". 18 for H.264, 22 for H.265. This means that H.265 can compress more
with the same quality. H.265 output is tagged hvc1, which is what players that trust
the tag look for. Audio is AAC either way, or dropped entirely with the mute toggle.

Before planning, the source is usually sampled: two two-second chunks are encoded
at the quality CRF, and their size shows what a quality encode of this footage
would really cost. Nothing is sampled when the target is so small that it
obviously binds. The result is cached per 15-second region, so nudging a trim
handle does not pay for it again.

From there the plan is one of two things:

- **Quality cut.** If a quality encode already fits under the target, or no
  target is set, every frame is re-encoded at a fixed CRF, audio included, since a
  stream copy on either track can only start on a keyframe, and starting anywhere
  else means the player stutters through a leftover fragment before resyncing.
  That's what puts the 'in' point exactly where it was asked for. When a target is
  set, `-maxrate` and `-bufsize` are added, because CRF alone has no size bound
  whatever.
- **Two-pass encode.** If the target binds, the budget is divided
  between audio and video and spent over two passes. Audio takes the best rate
  that fits in an eighth of the budget. If the remaining video bitrate is too low
  for the source's resolution, the picture is downscaled to 1080, 720, 480 or 360.

## File access

The renderer is sandboxed and never reads from disk itself. Main keeps a set of
paths the user has chosen, and both the probe and the `media://` protocol that
feeds the preview refuse anything outside it.

A file chosen through the open dialog is added to that set by main, which ran the
dialog. A dropped file is different, the path arrives from the renderer, so it is
checked before it is trusted. It must be an existing regular file with a container
extension the app opens. Either way the grant is read-only. Write access is granted
separately, only for the path returned by the save dialog, and the output may never
be the source.

## Conventions

Explanations live in docstrings on the function, hook or component they describe.
Anything broader than one symbol belongs here in the README instead.

Prettier does formatting with `npm run format`.

## Layout

```
src/
  main/          Electron main process
    ffmpeg/      ffmpeg/ffprobe binary resolution, probe, trim and compress jobs
    ipc/         IPC channel handlers
    media/       read and write grants, source validation, range requests
  preload/       contextBridge API exposed to the renderer
  renderer/src/  React UI
    components/
    hooks/
    lib/         formatting, target sizes, error reporting
    assets/
  shared/        types and constants used by both processes (@shared alias)
build/           packaging resources (icon.ico, icon.png)
resources/       runtime assets bundled into the app (icon.png)
```

## Project setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Checks

```bash
$ npm run typecheck
$ npm run lint
```

### Build

```bash
# NSIS installer, into dist/
$ npm run build:win

# build, then write dist/SHA256SUMS.txt
$ npm run release:win
```

## Bundled FFmpeg

FFmpeg and FFprobe are shipped as executables and run as separate processes.
They come from `ffmpeg-static` and `@ffprobe-installer/ffprobe`, and both builds
are GPLv3, the same licence as FFtrim itself. Both are gyan.dev builds of the
same `essentials` configuration. ffmpeg is 6.1.1, ffprobe a git snapshot from
nine months earlier, so the corresponding source for each is a commit in the
same repository. Versions, configure lines and those commits are recorded in
`THIRD-PARTY-NOTICES.md`, which is installed with the app under
`resources/licenses/` next to the licence text.

Only the binary for the platform being built is ever installed: both packages
resolve per target rather than carrying every platform at once.

## Licence

Copyright (C) 2026 phantom-builds.

FFtrim is free software: you can redistribute it and/or modify it under the
terms of the GNU General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later
version. It is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE. See `LICENSE` for the full text.

The whole app is GPLv3 rather than the bundled binaries alone, so there is no
question of where one licence stops and the other starts. Anyone given a release
build is entitled to the source it was built from, which is at
<https://github.com/phantom-builds-dev/fftrim>.
