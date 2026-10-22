# Offline subtitles — Windows setup

The UI supports two workflows:

- **Import SRT:** works without a speech model. Upload a timed `.srt` file in Studio Controls.
- **Transcribe clip:** uses a local, free Whisper.cpp executable and model. No paid cloud AI API.

## Local prerequisites (needed once on the Windows rendering PC)

1. Install FFmpeg and ensure `ffmpeg` is in PATH (or set `FFMPEG_PATH`).
2. Install a current Whisper.cpp build with `whisper-cli.exe`.
3. Download a compatible multilingual or English GGML Whisper model (e.g. `ggml-base.en.bin`) from its official project.
4. Set these **server-side** environment variables in the local Next.js process:
   - `WHISPER_CLI_PATH=C:\\tools\\whisper\\whisper-cli.exe`
   - `WHISPER_MODEL_PATH=C:\\tools\\whisper\\models\\ggml-base.en.bin`
   - Optionally `FFMPEG_PATH=C:\\tools\\ffmpeg\\bin\\ffmpeg.exe`

Do not expose these paths as `NEXT_PUBLIC_` values. Restart the server after configuration.

## How it works

In **Studio Controls → Timed subtitles**, click **Transcribe: [clip]**. The server checks ownership, retrieves the clip from private storage, converts audio to mono 16 kHz, runs the local speech recognizer, reads its SRT output and aligns caption timestamps with the clip's trim and overall timeline. Review the text and timing before rendering. Captions are stored as a draft in that browser's localStorage, not a synchronized cloud document.

Uploads are limited to 95 MB. The local process currently has a 10-minute timeout. Performance varies by machine and model. Clip transcription and final MP4 render are **not yet tested on Windows**. See GitHub code checks for TypeScript and ESLint results, if enabled.

## Limitations

Speech recognition is **not** word-by-word caption animation. Automatic highlight recognition based on actual motion or sound is not available; Clip Finder currently suggests splits using duration and transcript keywords. All edits require review before export or publishing.
