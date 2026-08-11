# Third-party notices

FFtrim ships two executables it did not build. Both are FFmpeg builds licensed
under the GNU General Public License version 3, the same licence as FFtrim
itself; the text is in `LICENSE`, and is installed with the app under
`resources/licenses/`. Neither is linked into FFtrim, each is launched as a
separate process, but both are redistributed with it, so the corresponding
source for each is identified below.

## ffmpeg.exe

Obtained through the [`ffmpeg-static`](https://github.com/eugeneware/ffmpeg-static)
npm package, which is itself GPLv3.

|                      |                                                      |
| -------------------- | ---------------------------------------------------- |
| Version              | `6.1.1-essentials_build-www.gyan.dev`                |
| Builder              | gyan.dev, `release-essentials` configuration         |
| Licence              | GPL v3 (`--enable-gpl --enable-version3`)            |
| Corresponding source | <https://github.com/FFmpeg/FFmpeg/commit/e38092ef93> |

Configured with:

```
--enable-gpl --enable-version3 --enable-static --pkg-config=pkgconf
--disable-w32threads --disable-autodetect --enable-fontconfig --enable-iconv
--enable-gnutls --enable-libxml2 --enable-gmp --enable-bzlib --enable-lzma
--enable-zlib --enable-libsrt --enable-libssh --enable-libzmq --enable-avisynth
--enable-sdl2 --enable-libwebp --enable-libx264 --enable-libx265 --enable-libxvid
--enable-libaom --enable-libopenjpeg --enable-libvpx --enable-mediafoundation
--enable-libass --enable-libfreetype --enable-libfribidi --enable-libharfbuzz
--enable-libvidstab --enable-libvmaf --enable-libzimg --enable-amf
--enable-cuda-llvm --enable-cuvid --enable-ffnvcodec --enable-nvdec --enable-nvenc
--enable-dxva2 --enable-d3d11va --enable-libvpl --enable-libgme --enable-libopenmpt
--enable-libopencore-amrwb --enable-libmp3lame --enable-libtheora
--enable-libvo-amrwbenc --enable-libgsm --enable-libopencore-amrnb --enable-libopus
--enable-libspeex --enable-libvorbis --enable-librubberband
```

`--enable-gpl` is what makes the build GPL rather than LGPL, and it is what
admits libx264 and libx265. FFtrim encodes with both, so an LGPL build would not
serve.

## ffprobe.exe

Obtained through the
[`@ffprobe-installer/ffprobe`](https://github.com/SavageCore/node-ffprobe-installer)
npm package, which resolves to one platform package per target. The wrapper
declares itself LGPL-2.1, which is wrong for a `--enable-gpl` build and in any
case covers only its own JavaScript; the platform package that carries the
executable, `@ffprobe-installer/win32-x64`, declares GPL-3.0 and names gyan.dev
as its author.

|                      |                                                           |
| -------------------- | --------------------------------------------------------- |
| Version              | `2023-02-13-git-2296078397-essentials_build-www.gyan.dev` |
| Builder              | gyan.dev, `essentials` configuration                      |
| Licence              | GPL v3 (`--enable-gpl --enable-version3`)                 |
| Corresponding source | <https://github.com/FFmpeg/FFmpeg/commit/2296078397>      |

Configured with:

```
--enable-gpl --enable-version3 --enable-static --disable-w32threads
--disable-autodetect --enable-fontconfig --enable-iconv --enable-gnutls
--enable-libxml2 --enable-gmp --enable-bzlib --enable-lzma --enable-zlib
--enable-libsrt --enable-libssh --enable-libzmq --enable-avisynth --enable-sdl2
--enable-libwebp --enable-libx264 --enable-libx265 --enable-libxvid --enable-libaom
--enable-libopenjpeg --enable-libvpx --enable-mediafoundation --enable-libass
--enable-libfreetype --enable-libfribidi --enable-libvidstab --enable-libvmaf
--enable-libzimg --enable-amf --enable-cuda-llvm --enable-cuvid --enable-ffnvcodec
--enable-nvdec --enable-nvenc --enable-d3d11va --enable-dxva2 --enable-libvpl
--enable-libgme --enable-libopenmpt --enable-libopencore-amrwb --enable-libmp3lame
--enable-libtheora --enable-libvo-amrwbenc --enable-libgsm --enable-libopencore-amrnb
--enable-libopus --enable-libspeex --enable-libvorbis --enable-librubberband
```

This is a git snapshot instead of a numbered release, so the source above is the
commit the build names in its own version string:
`22960783978d9e0b6d4a4ed21f503bd24662aa7e`, dated 2023-02-13. It is roughly nine
months older than the ffmpeg binary above and from the same builder, which is
close enough that both entries point into the same repository.
