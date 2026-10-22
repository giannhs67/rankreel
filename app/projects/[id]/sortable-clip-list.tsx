"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Clip } from "@/shared/types";
import { moveClipToPosition } from "./actions";
import { ClipRow } from "./clip-row";

type ClipItem = Pick<Clip, "id" | "title" | "number" | "storage_path" | "trim_start" | "trim_end">;

export function SortableClipList({ projectId, clips }: { projectId: string; clips: ClipItem[] }) {
  const router = useRouter();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function reorder(clipId: string, targetIndex: number) {
    setError(null);
    startTransition(async () => {
      try {
        await moveClipToPosition(projectId, clipId, targetIndex);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not reorder clips.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-black/50 dark:text-white/50">
        Drag clips to reorder on desktop, or use the position selector on mobile.
      </p>
      <ul className="space-y-2" aria-label="Ranking clips">
        {clips.map((clip, index) => (
          <li
            key={clip.id}
            draggable={!pending}
            onDragStart={(event) => {
              setDraggedId(clip.id);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", clip.id);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const id = draggedId || event.dataTransfer.getData("text/plain");
              if (id && id !== clip.id) reorder(id, index);
              setDraggedId(null);
            }}
            onDragEnd={() => setDraggedId(null)}
            className={draggedId === clip.id ? "opacity-50" : ""}
          >
            <div className="mb-1 flex items-center justify-between gap-2 px-1 text-xs text-black/50 dark:text-white/50">
              <span>☰ Playback {index + 1} · {clip.number == null ? "No rank set" : `Rank #${clip.number}`}</span>
              <label className="flex items-center gap-2">
                <span className="sr-only">Move {clip.title} to position</span>
                <select
                  aria-label={`Position for ${clip.title}`}
                  value={index}
                  disabled={pending}
                  onChange={(event) => reorder(clip.id, Number(event.target.value))}
                  className="rounded border border-black/15 bg-transparent px-2 py-1 text-xs dark:border-white/15"
                >
                  {clips.map((_, optionIndex) => (
                    <option key={optionIndex} value={optionIndex}>Move to {optionIndex + 1}</option>
                  ))}
                </select>
              </label>
            </div>
            <ClipRow projectId={projectId} clip={clip} isFirst={index === 0} isLast={index === clips.length - 1} />
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
