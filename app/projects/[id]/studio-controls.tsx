"use client";

import { useEffect, useState } from "react";
import { VIDEO_LOOKS, getVideoLookFilter, type VideoLook } from "@/shared/video-looks";

type StudioSettings = {
  videoLook: VideoLook;
  lookIntensity: number;
  clipLooks: Record<string, { look: VideoLook; intensity: number }>;
  mode: "simple" | "advanced";
  voice: "deep" | "energetic" | "documentary";
  script: string;
  captions: boolean;
  music: boolean;
  transitions: "cut" | "fade" | "zoom";
  captionStyle: "bold" | "minimal" | "karaoke";
  volume: number;
  autoCreate: boolean;
};

const defaults: StudioSettings = {
  videoLook: "original", lookIntensity: 100, clipLooks: {},
  mode: "simple", voice: "deep", script: "", captions: true,
  music: true, transitions: "cut", captionStyle: "bold",
  volume: 25, autoCreate: false,
};

export function StudioControls({ projectId, ranking = false }: { projectId: string; ranking?: boolean }) {
  const [settings, setSettings] = useState<StudioSettings>(defaults);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [voicePreviewing, setVoicePreviewing] = useState(false);
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
          setSettings({ ...defaults, ...parsed });
        }
      }
    } catch { /* Malformed or disabled browser storage falls back to defaults */ }
    setSettingsLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!settingsLoaded) return;
    try { window.localStorage.setItem(storageKey, JSON.stringify(settings)); }
    catch { /* Storage can be disabled in private browsing */ }
  }, [settings, settingsLoaded, storageKey]);

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
        <span className="text-xs text-black/50 dark:text-white/50">Per-word subtitles and background music are not active yet.</span>
      </div>
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
        Local autosave, Undo/Redo and settings import/export are available. Ranking effects are limited to ranking exports. Offline Windows narration is wired into all MP4 formats but awaits a real Windows render test. Automatic editing, timed captions and music are not yet available.
      </p>
    </section>
  );
}
