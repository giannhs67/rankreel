"use client";

import { useEffect, useMemo, useState } from "react";

type Clip = { id: string; title: string; number: number | null; trim_start: number | null; trim_end: number | null; storage_path: string };
type Rights = { status: "unknown" | "mine" | "licensed" | "permission"; source: string; note: string };
type Style = { category: string; preset: "clean" | "bold" | "cinematic"; captionStyle: "minimal" | "bold" | "karaoke"; videoLook: "original" | "cinematic" | "vintage" };
type Approval = { approved: boolean; notes: string };
const styleDefaults: Style = { category: "Funny", preset: "bold", captionStyle: "bold", videoLook: "original" };
const presetValues: Record<Style["preset"], { transitions: "cut" | "zoom" | "fade"; voice: "documentary" | "energetic" | "deep" }> = {
  clean: { transitions: "cut", voice: "documentary" },
  bold: { transitions: "zoom", voice: "energetic" },
  cinematic: { transitions: "fade", voice: "deep" },
};
function read<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; }
  catch { return fallback; }
}
const duration = (clip: Clip) => clip.trim_start != null && clip.trim_end != null ? Math.max(0, clip.trim_end - clip.trim_start) : null;
const clipSummary = (clips: Clip[]) => clips.map((clip, index) => ({
  index, id: clip.id, title: clip.title, number: clip.number, seconds: duration(clip),
}));
export function GrowthLab({ projectId, clips, ranking }: { projectId: string; clips: Clip[]; ranking: boolean }) {
  const [tab, setTab] = useState<"score" | "style" | "rights" | "story" | "health" | "queue">("score");
  const [hydrated, setHydrated] = useState(false);
  const [style, setStyle] = useState<Style>(styleDefaults);
  const [rights, setRights] = useState<Record<string, Rights>>({});
  const [approvals, setApprovals] = useState<Record<string, Approval>>({});
  const [hook, setHook] = useState(0);
  const [status, setStatus] = useState("");
  const key = "short-tube-growth-" + projectId;
  useEffect(() => {
    queueMicrotask(() => {
      const state = read<{ style?: Style; approvals?: Record<string, Approval> }>(key, {});
      setStyle(state.style ?? styleDefaults);
      setApprovals(state.approvals ?? {});
      setRights(read("short-tube-rights-" + projectId, {}));
      setHydrated(true);
    });
  }, [key, projectId]);
  useEffect(() => {
    if (hydrated) try { localStorage.setItem(key, JSON.stringify({ style, approvals })); } catch { /* storage blocked */ }
  }, [hydrated, key, style, approvals]);
  const hooks = [
    "Wait until you see number one!",
    "These moments get more unbelievable as we go.",
    "Which one deserves the top spot?",
  ];
  const summary = useMemo(() => clipSummary(clips), [clips]);
  const totalKnown = summary.reduce((sum, clip) => sum + (clip.seconds ?? 0), 0);
  const unknownCount = summary.filter(clip => clip.seconds == null).length;
  const rightsMissing = clips.filter(clip => {
    const info = rights[clip.id];
    return !info || info.status === "unknown" || (info.status !== "mine" && !info.source.trim());
  });
  const problems = [
    ...(!clips.length ? ["No clips uploaded."] : []),
    ...(ranking && clips.length !== 6 ? ["Top 6 ranking does not contain six scenes."] : []),
    ...clips.filter(clip => !clip.title.trim()).map(clip => "Missing title: " + clip.id.slice(0, 8)),
    ...clips.filter(clip => duration(clip) != null && (duration(clip)! < 0.6 || duration(clip)! > 35)).map(clip => "Check duration of " + clip.title),
    ...(unknownCount ? [unknownCount + " clips have unknown duration."] : []),
    ...(rightsMissing.length ? [rightsMissing.length + " clips need rights verification."] : []),
    ...(new Set(clips.map(clip => clip.number).filter(Boolean)).size !== clips.filter(clip => clip.number != null).length ? ["Duplicate ranking number."] : []),
  ];
  const score = Math.max(0, Math.min(100,
    100 - Math.abs((totalKnown || 35) - 35) * 0.4 - problems.length * 11 -
    (clips.length && clips.some(clip => clip.title.length > 85) ? 8 : 0)));
  function applyStyle() {
    if (!confirm("Apply this saved style to the current draft? Existing clips and trims stay untouched.")) return;
    const draftKey = "short-tube-studio-" + projectId;
    const saved = read<Record<string, unknown>>(draftKey, {});
    const patch = { ...presetValues[style.preset], captionStyle: style.captionStyle,
      videoLook: style.videoLook };
    try {
      localStorage.setItem(draftKey, JSON.stringify({ ...saved, ...patch }));
      window.dispatchEvent(new CustomEvent("short-tube-studio-update-" + projectId, { detail: patch }));
      setStatus("Style applied to draft. Review before export.");
    } catch { setStatus("Could not save style in this browser."); }
  }
  function setApproved(id: string, approved: boolean) {
    setApprovals(previous => ({ ...previous, [id]: { approved, notes: previous[id]?.notes ?? "" } }));
  }
  const button = (name: typeof tab, title: string) => <button key={name} type="button" onClick={() => { setTab(name); setStatus(""); }}
    aria-pressed={tab === name} className={tab === name ? "rounded-lg bg-amber-400 px-3 py-2 text-xs font-semibold text-black" : "rounded-lg border border-black/20 px-3 py-2 text-xs dark:border-white/20"}>{title}</button>;
  return <section className="space-y-4 rounded-2xl border border-black/10 p-4 dark:border-white/15">
    <div><h2 className="text-lg font-semibold">Creator Growth Lab · Preview</h2>
      <p className="text-xs opacity-60">Review-first helpers, local drafts and transparent estimates. Nothing uploads or publishes automatically.</p></div>
    <div className="flex flex-wrap gap-2">{button("score", "Viral score")}{button("style", "Style memory")}
      {button("rights", "Rights")}{button("story", "Storytelling")}{button("health", "Health check")}{button("queue", "Approval queue")}</div>
    {tab === "score" && <div className="space-y-3">
      <p className="text-3xl font-bold tabular-nums">{Math.round(score)}<span className="text-sm font-normal opacity-60"> / 100 · heuristic</span></p>
      <p className="text-sm">This is an editing checklist score based on duration, completeness and rights. It does not predict real views or platform performance.</p>
      <p className="text-xs">Total known duration: {totalKnown.toFixed(1)}s · {clips.length} scenes · {problems.length} checks</p>
      <p className="text-xs opacity-60">A/B test manually: use the Hook Generator, save two drafts, then compare actual published analytics later.</p>
    </div>}
    {tab === "style" && <div className="space-y-3">
      <label className="block text-xs">Category<input className="mt-1 block w-full rounded border bg-transparent p-2" maxLength={45}
        value={style.category} onChange={e => setStyle(s => ({ ...s, category: e.target.value }))}/></label>
      <label className="block text-xs">Preset<select className="mt-1 block w-full rounded border bg-transparent p-2" value={style.preset}
        onChange={e => setStyle(s => ({ ...s, preset: e.target.value as Style["preset"] }))}>
        <option value="clean">Clean</option><option value="bold">Bold</option><option value="cinematic">Cinematic</option></select></label>
      <label className="block text-xs">Captions<select className="mt-1 block w-full rounded border bg-transparent p-2" value={style.captionStyle}
        onChange={e => setStyle(s => ({ ...s, captionStyle: e.target.value as Style["captionStyle"] }))}>
        <option value="minimal">Minimal</option><option value="bold">Bold</option><option value="karaoke">Karaoke</option></select></label>
      <label className="block text-xs">Look<select className="mt-1 block w-full rounded border bg-transparent p-2" value={style.videoLook}
        onChange={e => setStyle(s => ({ ...s, videoLook: e.target.value as Style["videoLook"] }))}>
        <option value="original">Original</option><option value="cinematic">Cinematic</option><option value="vintage">Vintage</option></select></label>
      <button type="button" onClick={applyStyle} className="rounded bg-amber-400 px-3 py-2 text-xs font-bold text-black">Apply learned style to draft</button>
      <p className="text-xs opacity-60">Stores your chosen style on this device. This is preference memory, not automatic model training.</p>
    </div>}
    {tab === "rights" && <div className="space-y-2">
      <p className="text-xs opacity-60">Read-only summary from Creator Toolkit rights declarations. No automated copyright detection or guarantee.</p>
      <p className="font-semibold">{rightsMissing.length} / {clips.length} clips need review</p>
      {clips.map(clip => <p key={clip.id} className="rounded border border-black/10 p-2 text-xs dark:border-white/10">
        {clip.title}: {rights[clip.id]?.status ?? "unknown"} {rights[clip.id]?.source ? "· source recorded" : "· source not recorded"}</p>)}
    </div>}
    {tab === "story" && <div className="space-y-2">
      <p className="text-xs opacity-60">Suggested English countdown narrative. Copy it into the narration editor if it fits your clips.</p>
      <label className="block text-xs">Opening<select value={hook} onChange={e => setHook(Number(e.target.value))}
        className="mt-1 w-full rounded border bg-transparent p-2">
        {hooks.map((value, index) => <option key={index} value={index}>{value}</option>)}</select></label>
      <textarea readOnly rows={7} className="w-full rounded border bg-transparent p-2 text-xs" value={[
        hooks[hook], ...summary.map((clip, index) => "Number " + (ranking ? (clip.number ?? clips.length - index) : index + 1) + ": " + clip.title + "."),
        "Which moment would you put at number one?",
      ].join("\n")}/>
      <button type="button" className="rounded border px-3 py-2 text-xs" onClick={() => {
        const script = [hooks[hook], ...summary.map((clip, index) => "Number " + (clip.number ?? clips.length - index) + ": " + clip.title + "."), "Which is your favorite?"].join("\n");
        navigator.clipboard.writeText(script).then(() => setStatus("Script copied.")).catch(() => setStatus("Select and copy from text box."));
      }}>Copy script</button>
    </div>}
    {tab === "health" && <div className="space-y-2">
      <p className="text-xs opacity-60">Metadata checks only; full visual and audio checks require running video analysis.</p>
      {problems.length ? problems.map((problem, i) => <p key={i} className="rounded border border-amber-400/30 p-2 text-xs">⚠ {problem}</p>) :
        <p className="text-xs">No metadata issues detected. Still review the complete preview.</p>}
    </div>}
    {tab === "queue" && <div className="space-y-3">
      <p className="text-xs opacity-60">Local approval checklist. Mark scenes approved or needing review. No background rendering or publishing.</p>
      <p className="text-sm font-semibold">{clips.filter(c => approvals[c.id]?.approved).length} of {clips.length} scenes approved</p>
      {clips.map(clip => <div className="rounded border border-black/10 p-3 dark:border-white/10" key={clip.id}>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox"
          checked={!!approvals[clip.id]?.approved} onChange={e => setApproved(clip.id, e.target.checked)}/>{clip.title}</label>
        <input className="mt-2 w-full rounded border bg-transparent p-2 text-xs" placeholder="Review notes"
          value={approvals[clip.id]?.notes ?? ""} onChange={e => setApprovals(old => ({ ...old,
            [clip.id]: { approved: old[clip.id]?.approved ?? false, notes: e.target.value.slice(0, 400) } }))}/>
      </div>)}
      <button type="button" className="rounded border px-3 py-2 text-xs" onClick={() => {
        const data = { projectId, exportedAt: new Date().toISOString(), approvals, scenes: summary };
        const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
        const a = document.createElement("a"); a.href = url; a.download = "short-tube-approval.json"; a.click();
        URL.revokeObjectURL(url);
      }}>Export review checklist</button>
    </div>}
    {status && <p role="status" className="text-xs">{status}</p>}
  </section>;
}
