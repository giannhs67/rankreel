"use client";

import { useEffect, useState } from "react";

type StudioSettings = {
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
  mode: "simple", voice: "deep", script: "", captions: true,
  music: true, transitions: "cut", captionStyle: "bold",
  volume: 25, autoCreate: false,
};

export function StudioControls({ projectId }: { projectId: string }) {
  const [settings, setSettings] = useState<StudioSettings>(defaults);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [history, setHistory] = useState<StudioSettings[]>([]);
  const [future, setFuture] = useState<StudioSettings[]>([]);
  const storageKey = `short-tube-studio-${projectId}`;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setSettings({ ...defaults, ...JSON.parse(raw) });
    } catch { /* Use defaults if storage is unavailable */ }
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(settings));
      setSaved(true);
    } catch { setSaved(false); }
  }, [settings, storageKey, loaded]);

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
          <h2 className="text-lg font-semibold">Short Tube Studio</h2>
          <p className="text-xs text-black/50 dark:text-white/50">
            {saved ? "Draft saved on this device" : "Draft not saved"} · Settings are not yet applied to video rendering
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
          <span className="font-medium">English AI voice</span>
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
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Voiceover script</span>
        <textarea rows={settings.mode === "advanced" ? 6 : 3} value={settings.script}
          onChange={e => change({ script: e.target.value })}
          placeholder="These are the six most incredible moments..." className={input} />
      </label>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={settings.captions} onChange={e => change({ captions: e.target.checked })}/> Auto captions</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={settings.music} onChange={e => change({ music: e.target.checked })}/> Background music</label>
      </div>
      {settings.mode === "advanced" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Caption style</span>
            <select className={input} value={settings.captionStyle} onChange={e => change({ captionStyle: e.target.value as StudioSettings["captionStyle"] })}>
              <option value="bold">Bold viral</option><option value="minimal">Minimal</option><option value="karaoke">Karaoke</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Music volume: {settings.volume}%</span>
            <input className="w-full" type="range" min="0" max="100" value={settings.volume} onChange={e => change({ volume: Number(e.target.value) })}/>
          </label>
        </div>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={settings.autoCreate} onChange={e => change({ autoCreate: e.target.checked })}/>
        Prepare automatically, require my approval before export
      </label>
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
        Editor configuration prototype: local autosave, Undo/Redo, import/export work now. AI audio, automatic editing and applying these settings to MP4 are upcoming integrations.
      </p>
    </section>
  );
}
