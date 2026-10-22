"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { arrangeRankingNumbers } from "./actions";

type ClipInfo = { id: string; title: string; number: number | null };
function makeHooks(titles: string[]) {
  const names = titles.map(x => x.replace(/^[#0-9 .-]+/, "").trim()).filter(Boolean);
  const subject = names[0]?.slice(0, 65) || "these moments";
  return [
    `You won't believe how this Top 6 ends — especially number one!`,
    `These six ${subject} moments are seriously unexpected.`,
    `Wait until you see which clip takes the number one spot!`,
  ];
}
export function ShortsBuilder({ projectId, clips, ranking }: { projectId: string; clips: ClipInfo[]; ranking: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const hooks = makeHooks(clips.map(c => c.title));
  const [selectedHook, setSelectedHook] = useState(0);
  const [preset, setPreset] = useState<"clean" | "viral" | "cinematic">("viral");
  const styles = {
    clean: { transitions: "cut", captionStyle: "minimal", voice: "documentary" },
    viral: { transitions: "zoom", captionStyle: "bold", voice: "energetic" },
    cinematic: { transitions: "fade", captionStyle: "minimal", voice: "deep" },
  } as const;
  function prepareDraft() {
    setError(""); setMessage("");
    if (!clips.length) { setError("Upload at least one clip first."); return; }
    if (!confirm("Apply a proposed script and style to this project's draft? Current uploaded clips will not be deleted.")) return;
    start(async () => {
      try {
        if (ranking) await arrangeRankingNumbers(projectId);
        const key = "short-tube-studio-" + projectId;
        let existing: Record<string, unknown> = {};
        try {
          const parsed: unknown = JSON.parse(localStorage.getItem(key) || "{}");
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) existing = parsed as Record<string, unknown>;
        } catch { /* malformed local draft */ }
        const script = hooks[selectedHook] + "\n" + clips.map((clip, i) =>
          `Number ${clips.length - i}: ${clip.title}.`).join("\n") + "\nWhich one surprised you most?";
        const patch = { ...styles[preset], script, captions: true };
        localStorage.setItem(key, JSON.stringify({ ...existing, ...patch }));
        window.dispatchEvent(new CustomEvent("short-tube-studio-update-" + projectId, { detail: patch }));
        setMessage("Draft prepared. Review voiceover, clips and preview before rendering.");
        router.refresh();
      } catch (e) { setError(e instanceof Error ? e.message : "Could not prepare draft."); }
    });
  }
  return <section className="space-y-3 rounded-xl border border-black/10 p-4 dark:border-white/15">
    <div><h2 className="text-base font-semibold">Auto Shorts Builder · draft only</h2>
      <p className="text-xs opacity-60">Creates a suggested English narration and style from your uploaded clips. No external AI service or automatic publishing.</p></div>
    <label className="block text-xs font-medium">Opening hook
      <select className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2 dark:border-white/20"
        value={selectedHook} onChange={e => setSelectedHook(Number(e.target.value))}>
        {hooks.map((hook, index) => <option key={index} value={index}>{hook}</option>)}
      </select>
    </label>
    <label className="block text-xs font-medium">Draft style
      <select className="mt-1 w-full rounded-lg border border-black/15 bg-transparent p-2 dark:border-white/20"
        value={preset} onChange={e => setPreset(e.target.value as typeof preset)}>
        <option value="viral">Viral</option><option value="clean">Clean</option><option value="cinematic">Cinematic</option>
      </select>
    </label>
    <p className="text-xs opacity-60">{ranking ? "Applies countdown ranks based on existing playback order; does not move clips." : "Uses current scene order without changing trim or files."}</p>
    <button type="button" disabled={pending || !clips.length} onClick={prepareDraft}
      className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-semibold text-black disabled:opacity-40">
      {pending ? "Preparing…" : "Create draft for review"}
    </button>
    {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
    {message && <p role="status" className="text-xs">{message}</p>}
  </section>;
}
