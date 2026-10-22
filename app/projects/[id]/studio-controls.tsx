"use client";

import { useEffect, useState } from "react";
import { MusicControls } from "./music-controls";
import { parseSrt, type TimedCaption } from "@/shared/timed-captions";
import { SOUND_NAMES, type SoundCue, type SoundEffectKind } from "@/shared/sound-effects";
import type { MusicTrack } from "@/shared/music-track";
import { VIDEO_LOOKS, getVideoLookFilter, type VideoLook } from "@/shared/video-looks";

type StudioSettings = {
  videoLook: VideoLook;
  cropMode: "cover" | "contain";
  cropZoom: number;
  overlayText: string;
  lookIntensity: number;
  clipLooks: Record<string, { look: VideoLook; intensity: number }>;
  mode: "simple" | "advanced";
  voice: "deep" | "energetic" | "documentary";
  script: string;
  captions: boolean;
  music: boolean;
  musicTrack: MusicTrack | null;
  soundCues: SoundCue[];
  timedCaptions: TimedCaption[];
  transitions: "cut" | "fade" | "zoom";
  captionStyle: "bold" | "minimal" | "karaoke";
  volume: number;
  autoCreate: boolean;
};

const defaults: StudioSettings = {
  videoLook: "original", lookIntensity: 100, clipLooks: {},
  cropMode: "cover", cropZoom: 100, overlayText: "",
  mode: "simple", voice: "deep", script: "", captions: true,
  musicTrack: null, soundCues: [], timedCaptions: [], music: true, transitions: "cut", captionStyle: "bold",
  volume: 25, autoCreate: false,
};

export function StudioControls({ projectId, ranking = false, clips = [] }: { projectId: string; ranking?: boolean; clips?: { id: string; title: string; number: number | null }[] }) {
  const [settings, setSettings] = useState<StudioSettings>(defaults);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [voicePreviewing, setVoicePreviewing] = useState(false);
  const [transcribingId, setTranscribingId] = useState<string | null>(null);
  const [transcribeError, setTranscribeError] = useState("");
  const [history, setHistory] = useState<StudioSettings[]>([]);
  const [future, setFuture] = useState<StudioSettings[]>([]);
  const storageKey = `short-tube-studio-${projectId}`;

  // Load saved settings after hydration; do not overwrite them with defaults on first render.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StudioSettings>;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          queueMicrotask(() => setSettings({ ...defaults, ...parsed }));
        }
      }
    } catch { /* Malformed or disabled browser storage falls back to defaults */ }
    queueMicrotask(() => setSettingsLoaded(true));
  }, [storageKey]);

  useEffect(() => {
    if (!settingsLoaded) return;
    try { window.localStorage.setItem(storageKey, JSON.stringify(settings)); window.dispatchEvent(new Event(`short-tube-studio-saved-${projectId}`)); }
    catch { /* Storage can be disabled in private browsing */ }
  }, [settings, settingsLoaded, storageKey, projectId]);

  // Receive preset and script selections from the Creator Toolkit on the same page.
  // A direct event avoids stale localStorage overwrites and does not need a reload.
  useEffect(() => {
    const sync = (event: Event) => {
      const patch = (event as CustomEvent<Partial<StudioSettings>>).detail;
      if (!patch || typeof patch !== "object") return;
      setSettings(previous => ({ ...previous, ...patch }));
      setHistory([]);
      setFuture([]);
    };
    window.addEventListener(`short-tube-studio-update-${projectId}`, sync);
    return () => window.removeEventListener(`short-tube-studio-update-${projectId}`, sync);
  }, [projectId]);

  function change(patch: Partial<StudioSettings>) {
    setHistory(previous => [...previous.slice(-19), settings]);
    setFuture([]);
    setSettings(previous => ({ ...previous, ...patch }));
  }

  function undo() {
    if (!history.length) return;
    const previous = history[history.length - 1];
    setHistory(history.slice(0, -1));
    setFuture(old => [...old, settings]);
    setSettings(previous);
  }
  function redo() {
    if (!future.length) return;
    const next = future[future.length - 1];
    setFuture(future.slice(0, -1));
    setHistory(old => [...old, settings]);
    setSettings(next);
  }

  const input = "w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20";
  return (
    <section className="space-y-4 rounded-2xl border border-black/10 bg-black/[.02] p-4 dark:border-white/10 dark:bg-white/[.03]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{ranking ? "Ranking controls" : "Video controls"}</h2>
          <p className="text-xs text-black/50 dark:text-white/50">
            Draft autosave on this device · Only connected export effects are enabled
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" disabled={!history.length} onClick={undo} className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-30">Undo</button>
          <button type="button" disabled={!future.length} onClick={redo} className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-30">Redo</button>
        </div>
      </div>
      <div className="flex rounded-xl bg-black/5 p-1 dark:bg-white/10" role="group" aria-label="Editor mode">
        {(["simple", "advanced"] as const).map(mode => (
          <button type="button" key={mode} onClick={() => change({ mode })}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${settings.mode === mode ? "bg-foreground text-background" : ""}`}>
            {mode === "simple" ? "Simple mode" : "Advanced editor"}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">English narration voice</span>
          <select className={input} value={settings.voice} onChange={e => change({ voice: e.target.value as StudioSettings["voice"] })}>
            <option value="deep">Deep cinematic</option>
            <option value="energetic">Energetic viral</option>
            <option value="documentary">Documentary</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Transitions</span>
          <select className={input} value={settings.transitions} onChange={e => change({ transitions: e.target.value as StudioSettings["transitions"] })}>
            <option value="cut">Quick cut</option><option value="fade">Fade</option><option value="zoom">Zoom</option>
          </select>
        </label>
      </div>
      <details className="rounded-xl border border-black/10 p-3 dark:border-white/15">
        <summary className="cursor-pointer text-sm font-semibold">Crop / Zoom / Text overlay</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">Frame mode
            <select className={input} value={settings.cropMode} onChange={e => change({ cropMode: e.target.value as StudioSettings["cropMode"] })}>
              <option value="cover">Fill 9:16 (crop edges)</option>
              <option value="contain">Fit entire video (black bars)</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">Video zoom · {settings.cropZoom}%
            <input type="range" min={100} max={200} value={settings.cropZoom}
              onChange={e => change({ cropZoom: Number(e.target.value) })} className="w-full accent-amber-400" />
          </label>
        </div>
        <label className="mt-3 block space-y-1 text-sm">Custom overlay text
          <input maxLength={160} className={input} value={settings.overlayText}
            onChange={e => change({ overlayText: e.target.value })}
            placeholder="Optional headline shown above clips" />
        </label>
        <p className="mt-2 text-xs text-black/50 dark:text-white/50">Applies to all scenes in preview and MP4; titles and ranking stay editable separately.</p>
      </details>
      <div className="space-y-2">
        <p className="text-sm font-medium">Video look / color filter</p>
        <p className="text-xs text-black/50 dark:text-white/50">Changes video colors in the preview and MP4. Captions keep their own colors.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {(Object.entries(VIDEO_LOOKS) as [VideoLook, typeof VIDEO_LOOKS[VideoLook]][]).map(([value, look]) => (
            <button type="button" key={value} onClick={() => change({ videoLook: value })}
              aria-pressed={settings.videoLook === value}
              className={`rounded-lg border px-3 py-3 text-left text-xs font-semibold transition ${settings.videoLook === value ? "border-amber-400 bg-amber-400/15" : "border-black/15 dark:border-white/20"}`}>
              <span className="mb-2 block h-8 rounded-md" style={{
                background: "linear-gradient(115deg, #ed6c46 0%, #6d74bb 45%, #1d294a 100%)",
                filter: look.filter,
              }} />
              {look.label}
            </button>
          ))}
        </div>
      </div>
      <label className="block space-y-2 text-sm">
        <span className="flex justify-between"><span>Filter intensity</span><strong>{settings.lookIntensity}%</strong></span>
        <input type="range" min={0} max={100} value={settings.lookIntensity}
          onChange={e => change({ lookIntensity: Number(e.target.value) })} className="w-full accent-amber-400" />
        <span className="block text-xs text-black/50 dark:text-white/50">
          Applies to every clip unless you set an individual look below.
        </span>
        <span className="block h-7 rounded-lg" style={{
          background: "linear-gradient(115deg,#ed6c46,#6d74bb,#1d294a)",
          filter: getVideoLookFilter(settings.videoLook, settings.lookIntensity),
        }} />
      </label>
      {clips.length > 0 && (
        <details className="rounded-xl border border-black/10 p-3 dark:border-white/15">
          <summary className="cursor-pointer text-sm font-semibold">Individual clip looks ({clips.length})</summary>
          <p className="my-2 text-xs text-black/50 dark:text-white/50">Optional overrides. Choose Inherit to use the overall filter.</p>
          <div className="space-y-3">
            {clips.map(clip => {
              const custom = settings.clipLooks?.[clip.id];
              return <div key={clip.id} className="grid gap-2 border-t border-black/10 py-2 dark:border-white/10 sm:grid-cols-[1fr_150px_110px] sm:items-center">
                <span className="truncate text-xs font-medium">{clip.number != null ? `#${clip.number} · ` : ""}{clip.title}</span>
                <select aria-label={`Look for ${clip.title}`} value={custom?.look ?? "inherit"}
                  onChange={event => {
                    const next = { ...settings.clipLooks };
                    if (event.target.value === "inherit") delete next[clip.id];
                    else next[clip.id] = { look: event.target.value as VideoLook, intensity: custom?.intensity ?? 100 };
                    change({ clipLooks: next });
                  }} className={input}>
                  <option value="inherit">Inherit project look</option>
                  {(Object.entries(VIDEO_LOOKS) as [VideoLook, typeof VIDEO_LOOKS[VideoLook]][]).map(([key, value]) =>
                    <option key={key} value={key}>{value.label}</option>)}
                </select>
                <label className="flex items-center gap-2 text-xs">
                  <input aria-label={`Intensity for ${clip.title}`} type="range" min={0} max={100}
                    disabled={!custom} value={custom?.intensity ?? 100}
                    onChange={event => {
                      if (!custom) return;
                      change({ clipLooks: { ...settings.clipLooks, [clip.id]: { ...custom, intensity: Number(event.target.value) } } });
                    }} className="w-full accent-amber-400" />
                  <span className="w-8 tabular-nums">{custom?.intensity ?? "—"}</span>
                </label>
              </div>;
            })}
          </div>
        </details>
      )}
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Voiceover script</span>
        <textarea rows={settings.mode === "advanced" ? 6 : 3} value={settings.script}
          onChange={e => change({ script: e.target.value })}
          placeholder="Write the narration for your story, event or video..." className={input} />
      </label>
      <button type="button" className="rounded-lg border border-black/15 px-3 py-2 text-sm dark:border-white/20" onClick={() => {
        if (typeof window === "undefined") return;
        if (typeof window.speechSynthesis === "undefined") { window.alert("Speech preview is not supported in this browser."); return; }
        window.speechSynthesis.cancel();
        if (voicePreviewing) { setVoicePreviewing(false); return; }
        const utterance = new SpeechSynthesisUtterance(settings.script.trim() || "Welcome to Short Tube Studio.");
        utterance.lang = "en-US";
        utterance.rate = settings.voice === "energetic" ? 1.15 : settings.voice === "deep" ? 0.9 : 1;
        utterance.pitch = settings.voice === "deep" ? 0.75 : 1;
        utterance.onend = () => setVoicePreviewing(false);
        utterance.onerror = () => setVoicePreviewing(false);
        setVoicePreviewing(true);
        window.speechSynthesis.speak(utterance);
      }}>{voicePreviewing ? "Stop voice preview" : "Listen to browser voice preview"}</button>
      <p className="text-xs text-black/50 dark:text-white/50">Browser voice preview uses your device voice. On Windows, MP4 export uses installed Windows speech voices; the two may sound different.</p>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={settings.captions} onChange={e => change({ captions: e.target.checked })}/> {ranking ? "Clip title overlays" : "Show on-screen titles / captions"}</label>
        <span className="text-xs text-black/50 dark:text-white/50">Per-word subtitles are not active yet.</span>
      </div>
      <details className="rounded-xl border border-black/15 p-3 dark:border-white/20">
        <summary className="cursor-pointer text-sm font-semibold">Timed subtitles · SRT</summary>
        <p className="my-2 text-xs opacity-60">Import existing SRT timing into preview and MP4. This is not AI transcription yet.</p>
        <p className="mt-2 text-xs opacity-60">Offline AI transcription (Whisper.cpp): requires FFmpeg and a local model installed on the Windows host. No API credits.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {clips.map(clip => <button key={clip.id} type="button" disabled={transcribingId !== null}
            className="rounded border px-2 py-1.5 text-xs disabled:opacity-40"
            onClick={async () => {
              setTranscribingId(clip.id); setTranscribeError("");
              try {
                const response = await fetch("/api/transcribe", { method: "POST",
                  headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, clipId: clip.id }) });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || "Transcription failed");
                change({ timedCaptions: [...settings.timedCaptions, ...(data.captions as TimedCaption[])]
                  .sort((a, b) => a.start - b.start).slice(0, 500) });
              } catch (err) { setTranscribeError(err instanceof Error ? err.message : "Transcription failed"); }
              finally { setTranscribingId(null); }
            }}>{transcribingId === clip.id ? "Transcribing…" : `Transcribe: ${clip.title.slice(0, 30)}`}</button>)}
        </div>
        {transcribeError && <p role="alert" className="mt-2 text-xs text-red-500">{transcribeError}</p>}

        <input type="file" accept=".srt,text/plain" className="block w-full text-xs" onChange={async e => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 1000000) { alert("SRT must be below 1 MB."); return; }
          const captions = parseSrt(await file.text());
          if (!captions.length) { alert("No valid SRT subtitles found."); return; }
          change({ timedCaptions: captions });
          e.target.value = "";
        }} />
        <p className="mt-2 text-xs">{settings.timedCaptions.length} timed caption segments ready.</p>
        {!!settings.timedCaptions.length && <button type="button" onClick={() => change({ timedCaptions: [] })}
          className="mt-2 rounded border px-2 py-1 text-xs">Clear timed subtitles</button>}
      </details>
      <details className="rounded-xl border border-black/15 p-3 dark:border-white/20">
        <summary className="cursor-pointer text-sm font-semibold">Sound Effects · timed cues</summary>
        <p className="my-2 text-xs opacity-60">Generated pop, click and chime sounds, included in preview and MP4. Add at a precise second.</p>
        <div className="flex flex-wrap gap-2">
          {(["pop", "click", "chime"] as SoundEffectKind[]).map(kind =>
            <button key={kind} type="button" className="rounded border px-3 py-1.5 text-xs"
              onClick={() => {
                const raw = prompt("At what second should the sound play?", "0");
                if (raw === null) return;
                const atSeconds = Number(raw);
                if (!Number.isFinite(atSeconds) || atSeconds < 0 || atSeconds > 3600) { alert("Enter a time from 0 to 3600 seconds."); return; }
                change({ soundCues: [...(settings.soundCues ?? []), { id: crypto.randomUUID(), kind, atSeconds, volume: 70 }].slice(0, 40) });
              }}>+ {SOUND_NAMES[kind]}</button>)}
        </div>
        <div className="mt-2 space-y-1">
          {(settings.soundCues ?? []).map(cue => <div key={cue.id} className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-medium">{SOUND_NAMES[cue.kind]} @ {cue.atSeconds.toFixed(1)}s</span>
            <label>Volume {cue.volume}%
              <input type="range" min={0} max={100} value={cue.volume} onChange={e => change({ soundCues: settings.soundCues.map(item => item.id === cue.id ? { ...item, volume: Number(e.target.value) } : item) })} />
            </label>
            <button type="button" className="rounded border px-2 py-1" onClick={() => change({ soundCues: settings.soundCues.filter(item => item.id !== cue.id) })}>Remove</button>
          </div>)}
        </div>
      </details>
      {settingsLoaded && <MusicControls projectId={projectId} track={settings.musicTrack} enabled={settings.music} volume={settings.volume} onChange={change} />}
      {settings.mode === "advanced" && ranking && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Caption style</span>
            <select className={input} value={settings.captionStyle} onChange={e => change({ captionStyle: e.target.value as StudioSettings["captionStyle"] })}>
              <option value="bold">Bold viral</option><option value="minimal">Minimal</option><option value="karaoke">Karaoke</option>
            </select>
          </label>

        </div>
      )}
      <p className="text-xs text-black/50 dark:text-white/50">Review your preview before pressing Render MP4. Automatic creation is not available yet.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => {
          const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = "short-tube-settings.json"; a.click();
          URL.revokeObjectURL(url);
        }} className="rounded-lg border border-black/15 px-3 py-2 text-sm dark:border-white/20">Export settings JSON</button>
        <label className="cursor-pointer rounded-lg border border-black/15 px-3 py-2 text-sm dark:border-white/20">
          Import settings
          <input type="file" accept=".json,application/json" className="sr-only" onChange={async e => {
            const file = e.target.files?.[0]; if (!file) return;
            try {
              const parsed = JSON.parse(await file.text());
              if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
              const keys = Object.keys(defaults) as (keyof StudioSettings)[];
              const safe = Object.fromEntries(keys.filter(k => typeof parsed[k] === typeof defaults[k]).map(k => [k, parsed[k]]));
              change(safe);
            } catch { window.alert("Invalid settings file."); }
            e.target.value = "";
          }}/>
        </label>
      </div>
      <p className="text-xs text-black/50 dark:text-white/50">
        Local autosave, Undo/Redo and settings import/export are available. Ranking effects are limited to ranking exports. Offline Windows narration is wired into all MP4 formats but awaits a real Windows render test. Automatic editing and timed captions are not yet available. Music imports require host dependencies.
      </p>
    </section>
  );
}
