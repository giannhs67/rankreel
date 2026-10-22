"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { reuseProjectMedia } from "./actions";

type MediaItem = { id: string; title: string; storage_path: string; trim_start: number | null; trim_end: number | null };
export function MediaLibrary({ projectId, clips }: { projectId: string; clips: MediaItem[] }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const unique = [...new Map(clips.map(c => [c.storage_path, c])).values()];
  const filtered = unique.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));
  return <section className="space-y-3 rounded-xl border border-black/10 p-4 dark:border-white/15">
    <div><h2 className="font-semibold">Media Library · Project clips</h2>
      <p className="text-xs opacity-60">Reuse an uploaded video without reuploading. This library contains only this project's videos.</p>
    </div>
    <input aria-label="Search media" placeholder="Search videos…" value={search} onChange={e => setSearch(e.target.value)}
      className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20" />
    <div className="max-h-64 space-y-2 overflow-y-auto">
      {filtered.map(item => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-black/10 px-3 py-2 text-xs dark:border-white/10">
        <span className="min-w-0 truncate">{item.title}</span>
        <button type="button" disabled={busy} className="shrink-0 rounded-md border px-2 py-1 disabled:opacity-40"
          onClick={() => { setError(""); start(async () => {
            try { await reuseProjectMedia(projectId, item.id); router.refresh(); }
            catch (e) { setError(e instanceof Error ? e.message : "Could not reuse clip."); }
          }); }}>Reuse</button>
      </div>)}
      {!filtered.length && <p className="text-xs opacity-50">No matching videos.</p>}
    </div>
    {error && <p role="alert" className="text-xs text-red-500">{error}</p>}
  </section>;
}
