"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveQuickStyle } from "./editor/actions";

type QuickSettings = { textColor: string; accentColor: string; fontSize: number; captionOpacity?: number };

export function QuickStyle({
  projectId, initial, format,
}: { projectId: string; initial: QuickSettings; format: "ranking_list" | "title_banner" | "caption" }) {
  const router = useRouter();
  const [settings, setSettings] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  function save() {
    setMessage(null);
    startTransition(async () => {
      try {
        await saveQuickStyle(projectId, settings);
        setMessage("Style saved. Video preview refreshed.");
        setRevision(prev => prev + 1);
        router.refresh();
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Could not save style.");
      }
    });
  }

  return (
    <section id="quick-style" className="space-y-4 rounded-2xl border border-black/10 p-4 dark:border-white/15">
      <div>
        <h2 className="text-base font-semibold">Quick Style + Video Preview</h2>
        <p className="mt-1 text-xs text-black/55 dark:text-white/55">Edit basic colors and font size here; keep advanced layout and animation in the full Style editor.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-xs font-medium">Text color
          <input type="color" value={settings.textColor} onChange={e => setSettings(s => ({ ...s, textColor: e.target.value }))}
            className="block h-10 w-full rounded-lg border border-black/10 dark:border-white/15" />
        </label>
        <label className="space-y-1 text-xs font-medium">{format === "ranking_list" ? "Active rank" : format === "caption" ? "Caption background" : "Outline"}
          <input type="color" value={settings.accentColor} onChange={e => setSettings(s => ({ ...s, accentColor: e.target.value }))}
            className="block h-10 w-full rounded-lg border border-black/10 dark:border-white/15" />
        </label>
        <label className="col-span-2 space-y-1 text-xs font-medium sm:col-span-1">
          Font size · {settings.fontSize}px
          <input type="range" min={24} max={120} value={settings.fontSize}
            onChange={e => setSettings(s => ({ ...s, fontSize: Number(e.target.value) }))}
            className="block w-full accent-amber-400" />
        </label>
      </div>
      {format === "caption" && (
        <label className="block space-y-1 text-xs font-medium">
          <span>Caption background opacity · {settings.captionOpacity ?? 100}%</span>
          <input type="range" min={0} max={100} value={settings.captionOpacity ?? 100}
            onChange={e => setSettings(s => ({ ...s, captionOpacity: Number(e.target.value) }))}
            className="block w-full accent-amber-400" />
        </label>
      )}
      <button type="button" onClick={save} disabled={pending}
        className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50">
        {pending ? "Saving…" : "Save style & refresh preview"}
      </button>
      {message && <p role="status" className="text-xs">{message}</p>}
      <div className="overflow-hidden rounded-xl border border-black/10 bg-black dark:border-white/10">
        <iframe key={revision} title="Current video preview" loading="lazy"
          src={`/projects/${projectId}/preview?inline=1&revision=${revision}`}
          className="mx-auto block h-[620px] w-full max-w-[400px] bg-black" />
      </div>
      <p className="text-xs text-black/45 dark:text-white/45">
        This is the real project preview. Video playback may require loading media from storage.
      </p>
    </section>
  );
}
