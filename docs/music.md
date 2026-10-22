# Background music

Studio accepts a public YouTube video link or an MP3/WAV/M4A/OGG file (40 MB, 15 minutes maximum). Only import music you own or have permission to reuse. YouTube may reject a download; there is no login, cookie extraction or restriction bypass.

On the PC running Short Tube, install FFmpeg (including ffprobe) and yt-dlp and put both on PATH. For example, Windows Package Manager packages are Gyan.FFmpeg and yt-dlp.yt-dlp. Restart the app after installing. No paid API or credits are used.

Select song start/end in seconds, then its start position in the video. The selected excerpt stops at the end time shown or when the video ends. Music volume does not change the original clip volume. Preview and all three MP4 compositions use the same track and timing. Existing narration processing reduces the entire mixed soundtrack to 18% beneath speech.

Audio is kept in the existing private clips storage bucket. Music settings autosave on this browser, like other Studio settings. Signed links refresh when reopening controls and before MP4 export. Removing music detaches it; stored audio remains available in storage. Importing from the phone requires the host PC to be running and reachable.

Validation: TypeScript/lint checks where available; real YouTube import and MP4 rendering require the configured host and remain a manual check.
