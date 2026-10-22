"use client";

import { useEffect, useMemo, useState } from "react";
import { inspectProject } from "@/shared/project-inspector.mjs";

type ClipInfo = { id: string; title: string; number: number | null; trim_start: number | null; trim_end: number | null };
type Right = { status: "unknown" | "mine" | "licensed" | "permission"; source: string; note: string };
const emptyRight: Right = { status: "unknown", source: "", note: "" };
const presets = ["Clean", "Bold", "Cinematic"] as const;
type Preset = typeof presets[number];
const presetOptions: Record<Preset, { transitions: string; captionStyle: string; voice: string }> = {
  Clean: { transitions: "cut", captionStyle: "minimal", voice: "documentary" },
  Bold: { transitions: "zoom", captionStyle: "bold", voice: "energetic" },
  Cinematic: { transitions: "fade", captionStyle: "minimal", voice: "deep" },
};
function safeJSON(value: string | null): unknown {
  if (!value) return null;
  try { return JSON.parse(value); } catch { return null; }
}
export function CreatorTools({ projectId, clips, ranking }: { projectId: string; clips: ClipInfo[]; ranking: boolean }) {
  const storageKey = "short-tube-rights-" + projectId;
  const styleKey = "short-tube-style-" + projectId;
  const [rights, setRights] = useState<Record<string, Right>>({});
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [scriptA, setScriptA] = useState("");
  const [scriptB, setScriptB] = useState("");
  const [active, setActive] = useState<"check" | "rights" | "story" | "style">("check");
  const [loaded, setLoaded] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    const storedRights = safeJSON(localStorage.getItem(storageKey));
    if (storedRights && typeof storedRights === "object" && !Array.isArray(storedRights)) setRights(storedRights as Record<string, Right>);
    const storedSettings = safeJSON(localStorage.getItem("short-tube-studio-" + projectId));
    if (storedSettings && typeof storedSettings === "object" && !Array.isArray(storedSettings)) setSettings(storedSettings as Record<string, unknown>);
    const savedScripts = safeJSON(localStorage.getItem("short-tube-ab-" + projectId)) as { a?: string; b?: string } | null;
    if (savedScripts && typeof savedScripts === "object") { setScriptA(savedScripts.a ?? ""); setScriptB(savedScripts.b ?? ""); }
    setLoaded(true);
  }, [projectId, storageKey]);

  useEffect(() => {
    if (loaded) localStorage.setItem(storageKey, JSON.stringify(rights));
  }, [loaded, rights, storageKey]);
  useEffect(() => {
    if (loaded) localStorage.setItem("short-tube-ab-" + projectId, JSON.stringify({ a: scriptA, b: scriptB }));
  }, [loaded, projectId, scriptA, scriptB]);

  const issues = useMemo(() => inspectProject({ clips, ranking, licenses: rights, settings }), [clips, ranking, rights, settings]);
  const errors = issues.filter((issue: { level: string }) => issue.level === "error").length;
  const warnings = issues.filter((issue: { level: string }) => issue.level === "warning").length;

  function updateRight(id: string, patch: Partial<Right>) {
    setRights(previous => ({ ...previous, [id]: { ...emptyRight, ...previous[id], ...patch } }));
    setNote("");
  }
  function applyPreset(preset: Preset) {
    try {
      const key = "short-tube-studio-" + projectId;
      const existing = safeJSON(localStorage.getItem(key));
      const base = existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {};
      const next = { ...base, ...presetOptions[preset] };
      localStorage.setItem(key, JSON.stringify(next));
      localStorage.setItem(styleKey, preset);
      window.dispatchEvent(new CustomEvent("short-tube-studio-update-" + projectId, { detail: presetOptions[preset] }));
      setSettings(next);
      setNote(preset + " applied to the studio controls.");
    } catch {
      setNote("Could not save preset in this browser.");
    }
  }

  const sectionButton = (tab: typeof active, title: string) =>
    <button type="button" key={tab} onClick={() => setActive(tab)}
      className={active === tab ? "rounded-lg bg-amber-400 px-3 py-2 text-xs font-semibold text-black" : "rounded-lg border border-white/15 px-3 py-2 text-xs text-white/80 hover:border-amber-400/60"}>{title}</button>;

  return (
    <section className="space-y-4 rounded-2xl border border-amber-400/20 bg-[#12141b] p-4 text-white sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-amber-400">Creator toolkit · beta</p>
          <h2 className="mt-1 text-xl font-bold">Review before export</h2>
          <p className="mt-1 text-xs text-white/50">Free, local browser helpers. No AI credits and no automatic publishing.</p>
        </div>
        <span className="rounded-lg border border-white/15 px-3 py-2 text-xs">{errors} errors · {warnings} warnings</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {sectionButton("check", "Quality")}
        {sectionButton("rights", "Clip rights")}
        {sectionButton("story", ranking ? "Ranking hooks" : "A/B scripts")}
        {sectionButton("style", "My style")}
      </div>
      {active === "check" && (
        <div className="space-y-2">
          <p className="text-xs text-white/55">Metadata checks only: titles, numbering, trimming and recorded rights. This cannot detect black frames, silent audio or visual errors yet.</p>
          <button type="button" onClick={() => {
            const value = safeJSON(localStorage.getItem("short-tube-studio-" + projectId));
            setSettings(value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {});
          }} className="rounded-lg border border-white/20 px-3 py-2 text-xs">Refresh checks from saved studio settings</button>
          {issues.length === 0 ? <p className="rounded-lg bg-emerald-400/10 p-3 text-sm text-emerald-300">No metadata issues found. Always review the full video manually.</p> :
            <ul className="space-y-2">{issues.map((issue: { id: string; level: string; message: string }) =>
              <li key={issue.id} className="rounded-lg border border-white/10 bg-white/[.04] px-3 py-2 text-sm">
                <span className={issue.level === "error" ? "font-semibold text-red-300" : issue.level === "warning" ? "font-semibold text-amber-300" : "font-semibold text-sky-300"}>{issue.level.toUpperCase()} · </span>{issue.message}
              </li>)}</ul>}
        </div>
      )}
      {active === "rights" && (
        <div className="space-y-3">
          <p className="text-xs text-white/55">Record the source and usage permission for each clip. Self-reported metadata does not verify copyright or guarantee monetization.</p>
          {clips.length === 0 && <p className="text-sm text-white/50">Upload clips first.</p>}
          {clips.map(clip => <div key={clip.id} className="space-y-2 rounded-xl border border-white/10 bg-white/[.035] p-3">
            <p className="truncate text-sm font-medium">{clip.number != null ? "#" + clip.number + " · " : ""}{clip.title}</p>
            <select aria-label={"Rights status for " + clip.title} value={rights[clip.id]?.status ?? "unknown"} onChange={e => updateRight(clip.id, { status: e.target.value as Right["status"] })} className="w-full rounded-lg border border-white/20 bg-[#262a34] p-2 text-sm">
              <option value="unknown">Not verified</option>
              <option value="mine">My own footage</option>
              <option value="licensed">Licensed material</option>
              <option value="permission">Creator permission</option>
            </select>
            <input aria-label={"Source for " + clip.title} value={rights[clip.id]?.source ?? ""} onChange={e => updateRight(clip.id, { source: e.target.value })} placeholder="Original source / license URL" className="w-full rounded-lg border border-white/20 bg-[#262a34] p-2 text-sm placeholder:text-white/35" />
            <input aria-label={"License note for " + clip.title} value={rights[clip.id]?.note ?? ""} onChange={e => updateRight(clip.id, { note: e.target.value })} placeholder="License type or permission note" className="w-full rounded-lg border border-white/20 bg-[#262a34] p-2 text-sm placeholder:text-white/35" />
          </div>)}
          <p className="text-xs text-white/45">Saved on this browser only. Not a legal check and does not block MP4 export.</p>
        </div>
      )}
      {active === "story" && (
        <div className="space-y-3">
          <p className="text-xs text-white/55">Create two alternative intros, compare them and choose one. Both drafts stay on this device until you copy the winner into the Voiceover script field.</p>
          {ranking && (
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/[.06] p-3">
              <p className="mb-2 text-xs font-semibold text-amber-300">Ranking story suggestions</p>
              <p className="text-sm">Hook: These {clips.length || 6} moments get crazier with every rank. Wait until number one.</p>
              <p className="mt-1 text-xs text-white/60">Tip: Give each rank a short title and reveal the strongest clip last.</p>
              <button type="button" className="mt-3 rounded-lg bg-amber-400 px-3 py-2 text-xs font-semibold text-black" onClick={() => {
                const hook = "These " + (clips.length || 6) + " moments get crazier with every rank. Wait until number one.";
                const key = "short-tube-studio-" + projectId;
                const stored = safeJSON(localStorage.getItem(key));
                const base = stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
                const script = String(base && "script" in base ? base.script ?? "" : "").trim();
                const nextScript = script ? hook + "\n\n" + script : hook;
                const next = { ...base, script: nextScript };
                localStorage.setItem(key, JSON.stringify(next));
                window.dispatchEvent(new CustomEvent("short-tube-studio-update-" + projectId, { detail: { script: nextScript } }));
                setSettings(next);
                setNote("Ranking hook added to the narration script.");
              }}>Add hook to voiceover</button>
            </div>
          )}
          <label className="block space-y-1 text-xs text-white/70">Version A<textarea value={scriptA} onChange={e => setScriptA(e.target.value)} rows={3} placeholder="Write hook A..." className="w-full rounded-lg border border-white/20 bg-[#262a34] p-3 text-sm text-white" /></label>
          <label className="block space-y-1 text-xs text-white/70">Version B<textarea value={scriptB} onChange={e => setScriptB(e.target.value)} rows={3} placeholder="Write hook B..." className="w-full rounded-lg border border-white/20 bg-[#262a34] p-3 text-sm text-white" /></label>
          <div className="flex flex-wrap gap-2">
            {([{ label: "Use A as voiceover", text: scriptA }, { label: "Use B as voiceover", text: scriptB }]).map(option => (
              <button key={option.label} type="button" disabled={!option.text.trim()} onClick={() => {
                const key = "short-tube-studio-" + projectId;
                const stored = safeJSON(localStorage.getItem(key));
                const base = stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
                const next = { ...base, script: option.text };
                localStorage.setItem(key, JSON.stringify(next));
                window.dispatchEvent(new CustomEvent("short-tube-studio-update-" + projectId, { detail: { script: option.text } }));
                setSettings(next);
                setNote(option.label + " selected for narration.");
              }} className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-semibold text-black disabled:opacity-40">{option.label}</button>
            ))}
          </div>
          <p className="text-xs text-white/50">This compares text drafts, not rendered A/B videos.</p>
        </div>
      )}
      {active === "style" && (
        <div className="space-y-3">
          <p className="text-xs text-white/55">One-click settings presets. This is not AI learning from your videos yet.</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {presets.map(preset => <button type="button" key={preset} onClick={() => applyPreset(preset)} className="rounded-xl border border-white/15 bg-white/[.04] p-3 text-left hover:border-amber-400/60">
              <span className="text-sm font-semibold">{preset}</span>
              <span className="mt-1 block text-xs text-white/50">{presetOptions[preset].transitions} · {presetOptions[preset].voice}</span>
            </button>)}
          </div>
          <p className="text-xs text-white/45">Presets affect settings supported by the current format; MP4 export still requires testing.</p>
        </div>
      )}
      {note && <p role="status" className="rounded-lg bg-amber-400/10 p-3 text-xs text-amber-200">{note}</p>}
    </section>
  );
}
