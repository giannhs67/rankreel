"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { parseTimedCaptions, type TimedCaption } from "@/shared/timed-captions";
import { useRouter } from "next/navigation";
import { splitScene } from "./actions";

type Scene = { id: string; title: string; trim_start: number | null; trim_end: number | null };

export function ClipFinder({ projectId, clips, ranking }: { projectId: string; clips: Scene[]; ranking: boolean }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [error, setError] = useState("");
  const [captions, setCaptions] = useState<TimedCaption[]>([]);
  useEffect(() => {
    const sync = () => {
      try { const saved = JSON.parse(localStorage.getItem("short-tube-studio-" + projectId) ?? "{}");
        setCaptions(parseTimedCaptions(saved.timedCaptions)); } catch { setCaptions([]); }
    };
    sync();
    window.addEventListener("short-tube-studio-saved-" + projectId, sync);
    return () => window.removeEventListener("short-tube-studio-saved-" + projectId, sync);
  }, [projectId]);
  const [chosen, setChosen] = useState<Record<string, number>>({});
  const suggestions = clips.flatMap(scene => {
    if (scene.trim_start == null || scene.trim_end == null) return [];
    const duration = scene.trim_end - scene.trim_start;
    if (duration < 7) return [];
    const recommended = scene.trim_start + Math.min(8, Math.max(2.5, duration * 0.5));
    return [{ ...scene, duration, recommended: Number(recommended.toFixed(1)) }];
  });
  // Score transcript hooks locally. No model inference and no automatic editing.
  const hookCandidates = useMemo(() => {
    const ranked = captions.map(line => {
      const words = line.text.toLowerCase();
      const score = (/[!?]/.test(line.text) ? 3 : 0) +
        (/\\b(unbelievable|impossible|crazy|amazing|never|biggest|funniest|top|best|worst|insane|look|watch|why|how)\\b/.test(words) ? 3 : 0) +
        (line.text.length >= 25 && line.text.length <= 130 ? 1 : 0);
      return { ...line, score };
    }).filter(line => line.score >= 3).sort((a, b) => b.score - a.score || a.start - b.start).slice(0, 5);
    return ranked;
  }, [captions]);
  return <section className="space-y-3 rounded-xl border border-black/10 p-4 dark:border-white/15">
    <div>
      <h2 className="font-semibold">Clip Finder · Review suggestions</h2>
      <p className="mt-1 text-xs opacity-60">
        Duration-based split suggestions and transcript keyword highlights. No visual AI or automatic cuts; approve individually.
      </p>
    </div>
    {ranking && <p className="text-xs opacity-70">Ranking keeps one scene per rank. Switch to Story or Title format to split scenes.</p>}
    <div className="space-y-2">
      <h3 className="text-xs font-semibold">Transcript highlights · {hookCandidates.length} suggested</h3>
      {hookCandidates.map((line, index) => <div key={index} className="rounded-lg border border-black/10 p-2 text-xs dark:border-white/15">
        <span className="font-semibold">{line.start.toFixed(1)}s–{line.end.toFixed(1)}s</span>
        <p className="mt-1">{line.text}</p>
      </div>)}
      {!captions.length && <p className="text-xs opacity-60">Import SRT or transcribe clips to enable text-based highlight suggestions.</p>}
    </div>
    <div className="space-y-2">
      {suggestions.map(scene => <div key={scene.id} className="space-y-2 rounded-lg border border-black/10 px-3 py-2 dark:border-white/15">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="min-w-0 truncate text-xs font-medium">{scene.title} · {scene.duration.toFixed(1)}s</p>
          <span className="text-xs opacity-60">Suggested cut at {scene.recommended}s</span>
        </div>
        {!ranking && <div className="flex items-center gap-2">
          <label className="text-xs">Cut at (source seconds):
            <input type="number" step="0.1" min={scene.trim_start! + 0.1} max={scene.trim_end! - 0.1}
              value={chosen[scene.id] ?? scene.recommended}
              onChange={e => setChosen(prev => ({ ...prev, [scene.id]: Number(e.target.value) }))}
              className="ml-2 w-20 rounded border border-black/20 bg-transparent px-2 py-1 dark:border-white/20" />
          </label>
          <button type="button" disabled={busy} className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-40"
            onClick={() => { setError(""); start(async () => {
              try { await splitScene(projectId, scene.id, chosen[scene.id] ?? scene.recommended); router.refresh(); }
              catch (e) { setError(e instanceof Error ? e.message : "Could not split."); }
            }); }}>Approve split</button>
        </div>}
      </div>)}
      {!suggestions.length && <p className="text-xs opacity-50">No longer scenes with known trim windows to suggest cuts for.</p>}
    </div>
    {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
  </section>;
}
