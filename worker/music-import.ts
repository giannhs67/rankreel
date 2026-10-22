import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const exec = promisify(execFile);

export function youtubeVideoUrl(input: string) {
  const url = new URL(input);
  if (url.protocol !== "https:" || url.username || url.password || url.port) throw new Error("Enter a valid YouTube video link.");
  const host = url.hostname.toLowerCase();
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1);
  if (["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"].includes(host)) {
    id = url.pathname === "/watch" ? url.searchParams.get("v") : /^\/(shorts|embed)\/([^/]+)$/.exec(url.pathname)?.[2] ?? null;
  }
  if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) throw new Error("Enter a single YouTube video link, not a playlist.");
  return "https://www.youtube.com/watch?v=" + id;
}

export async function prepareMusic(file: File | null, youtube: string) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "short-tube-music-"));
  try {
    let filename: string;
    let title: string;
    if (file) {
      if (file.size <= 0 || file.size > 40 * 1024 * 1024) throw new Error("Audio must be under 40 MB.");
      const ext = path.extname(file.name).toLowerCase();
      if (![".mp3", ".wav", ".m4a", ".ogg"].includes(ext)) throw new Error("Choose MP3, WAV, M4A or OGG.");
      filename = path.join(dir, "audio" + ext);
      title = file.name.slice(0, 180);
      await fs.writeFile(filename, Buffer.from(await file.arrayBuffer()));
    } else {
      const url = youtubeVideoUrl(youtube);
      filename = path.join(dir, "audio.mp3");
      title = "YouTube · " + new URL(url).searchParams.get("v");
      await exec("yt-dlp", ["--ignore-config", "--no-playlist", "--no-progress", "--max-filesize", "40M",
        "--match-filter", "duration <= 900 & !is_live", "-f", "bestaudio", "-x", "--audio-format", "mp3",
        "--output", filename, "--", url], { timeout: 180000, maxBuffer: 1024 * 1024, windowsHide: true });
    }
    const stat = await fs.stat(filename);
    if (stat.size > 40 * 1024 * 1024) throw new Error("Audio must be under 40 MB.");
    const { stdout } = await exec("ffprobe", ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=duration", "-of", "json", filename], { timeout: 15000, windowsHide: true });
    const duration = Number(JSON.parse(stdout).streams?.[0]?.duration);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 900) throw new Error("Choose audio up to 15 minutes with a readable audio stream.");
    return { bytes: await fs.readFile(filename), duration, title, ext: path.extname(filename).slice(1) };
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
}
