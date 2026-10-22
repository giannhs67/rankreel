"use client";
import { useEffect, useRef, useState } from "react";
import type { MusicTrack } from "@/shared/music-track";

type Props = { projectId: string; track: MusicTrack | null; enabled: boolean; volume: number;
  onChange: (patch: { musicTrack?: MusicTrack | null; music?: boolean; volume?: number }) => void };
export function MusicControls({ projectId, track, enabled, volume, onChange }: Props) {
  const [youtube, setYoutube] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const audio = useRef<HTMLAudioElement>(null);
  const changeRef = useRef(onChange);
  const trackRef = useRef(track);
  useEffect(() => { trackRef.current = track; }, [track]);
  useEffect(() => { changeRef.current = onChange; }, [onChange]);
  const storagePath = track?.storagePath;
  useEffect(() => {
    if (!storagePath) return;
    let cancelled = false;
    const form = new FormData(); form.set("projectId", projectId); form.set("storagePath", storagePath);
    fetch("/api/music", { method: "POST", body: form }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (!cancelled && trackRef.current?.storagePath === storagePath) changeRef.current({ musicTrack: { ...trackRef.current, url: data.url } });
    }).catch(() => { if (!cancelled) setError("Could not refresh music. Reimport if playback fails."); });
    return () => { cancelled = true; };
  }, [storagePath, projectId]);
  useEffect(() => { if (audio.current) audio.current.volume = volume / 100; }, [volume, track?.url]);
  async function importMusic() {
    setBusy(true); setError("");
    try {
      const form = new FormData(); form.set("projectId", projectId); form.set("rightsConfirmed", String(rights));
      if (file) form.set("file", file); else form.set("youtube", youtube);
      const response = await fetch("/api/music", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Import failed");
      onChange({ musicTrack: data as MusicTrack, music: true });
    } catch (err) { setError(err instanceof Error ? err.message : "Import failed"); }
    finally { setBusy(false); }
  }
  const input = "w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20";
  const update = (patch: Partial<MusicTrack>) => { if (track) onChange({ musicTrack: { ...track, ...patch } }); };
  return <section className="space-y-3 rounded-xl border border-black/15 p-4 dark:border-white/20">
    <h3 className="font-semibold">Background music</h3>
    <input aria-label="YouTube song link" type="url" value={youtube} onChange={e => { setYoutube(e.target.value); setFile(null); }} placeholder="Paste a YouTube song link" className={input} />
    <label className="block text-sm">Or upload MP3 / WAV / M4A / OGG
      <input type="file" accept=".mp3,.wav,.m4a,.ogg" disabled={busy} onChange={e => setFile(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-xs" />
    </label>
    {file && <p className="text-xs">Selected: {file.name}</p>}
    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={rights} onChange={e => setRights(e.target.checked)} />I own this audio or have permission to use it.</label>
    <button type="button" disabled={busy || !rights || (!youtube.trim() && !file)} onClick={importMusic} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">{busy ? "Importing audio…" : "Import music"}</button>
    <p className="text-xs opacity-60">YouTube import runs on the host PC and needs yt-dlp + FFmpeg. A YouTube link does not grant music rights.</p>
    {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
    {track && <>
      <p className="truncate text-sm font-medium">{track.title} · {track.duration.toFixed(1)}s</p>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={e => onChange({ music: e.target.checked })} />Include music in preview and MP4</label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs">Song start (seconds)<input type="number" min={0} max={Math.max(0, track.sourceEnd - 0.1)} step={0.1} value={track.sourceStart} onChange={e => { const n = Number(e.target.value); if (n >= 0 && n < track.sourceEnd) update({ sourceStart: n }); }} className={input} /></label>
        <label className="text-xs">Song end (seconds)<input type="number" min={track.sourceStart + 0.1} max={track.duration} step={0.1} value={track.sourceEnd} onChange={e => { const n = Number(e.target.value); if (n > track.sourceStart && n <= track.duration) update({ sourceEnd: n }); }} className={input} /></label>
        <label className="text-xs">Start in video (seconds)<input type="number" min={0} max={3600} step={0.1} value={track.videoStart} onChange={e => { const n = Number(e.target.value); if (n >= 0 && n <= 3600) update({ videoStart: n }); }} className={input} /></label>
      </div>
      <p className="text-xs opacity-70">Plays from {track.videoStart.toFixed(1)}s to {(track.videoStart + track.sourceEnd - track.sourceStart).toFixed(1)}s in the video, or until the video ends.</p>
      <label className="block text-sm">Music volume: {volume}%<input aria-label="Music volume" type="range" min={0} max={100} value={volume} onChange={e => onChange({ volume: Number(e.target.value) })} className="block w-full" /></label>
      <audio ref={audio} src={track.url} controls preload="metadata" onPlay={e => { const a = e.currentTarget; if (a.currentTime < track.sourceStart || a.currentTime >= track.sourceEnd) a.currentTime = track.sourceStart; }} onTimeUpdate={e => { const a = e.currentTarget; if (a.currentTime >= track.sourceEnd) { a.pause(); a.currentTime = track.sourceStart; } }} className="w-full" />
      <button type="button" onClick={() => { audio.current?.pause(); onChange({ musicTrack: null, music: false }); }} className="rounded-lg border px-3 py-2 text-xs">Remove music from video</button>
    </>}
  </section>;
}
