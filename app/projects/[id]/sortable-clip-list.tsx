"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Clip } from "@/shared/types";
import { moveClipToPosition, arrangeRankingNumbers, restoreRankingNumbers } from "./actions";
import { ClipRow } from "./clip-row";

type ClipItem = Pick<Clip, "id" | "title" | "number" | "storage_path" | "trim_start" | "trim_end">;

export function SortableClipList({ projectId, clips, ranking = false }: { projectId: string; clips: ClipItem[]; ranking?: boolean }) {
  const router = useRouter();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ clipId: string; from: number; to: number } | null>(null);
  const [redoMove, setRedoMove] = useState<{ clipId: string; from: number; to: number } | null>(null);
  const [lastRanks, setLastRanks] = useState<{ id: string; number: number | null }[] | null>(null);

  function reorder(clipId: string, targetIndex: number) {
    setError(null);
    startTransition(async () => {
      try {
        const from = clips.findIndex(clip => clip.id === clipId);
        await moveClipToPosition(projectId, clipId, targetIndex);
        if (from !== targetIndex) { setLastMove({ clipId, from, to: targetIndex }); setRedoMove(null); }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not reorder clips.");
      }
    });
  }

  function undoMove() {
    if (!lastMove) return;
    setError(null);
    startTransition(async () => {
      try {
        await moveClipToPosition(projectId, lastMove.clipId, lastMove.from);
        setRedoMove(lastMove);
        setLastMove(null);
        router.refresh();
      } catch (err) { setError(err instanceof Error ? err.message : "Could not undo move."); }
    });
  }

  function redoLastMove() {
    if (!redoMove) return;
    setError(null);
    startTransition(async () => {
      try {
        await moveClipToPosition(projectId, redoMove.clipId, redoMove.to);
        setLastMove(redoMove);
        setRedoMove(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not redo move.");
      }
    });
  }

  function autoRank() {
    setError(null);
    startTransition(async () => {
      try {
        const previous = await arrangeRankingNumbers(projectId);
        setLastRanks(previous);
        router.refresh();
      } catch (err) { setError(err instanceof Error ? err.message : "Could not arrange ranks."); }
    });
  }

  function undoRanks() {
    if (!lastRanks) return;
    setError(null);
    startTransition(async () => {
      try {
        await restoreRankingNumbers(projectId, lastRanks);
        setLastRanks(null);
        router.refresh();
      } catch (err) { setError(err instanceof Error ? err.message : "Could not restore ranks."); }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {ranking && <button type="button" onClick={autoRank} disabled={pending || !clips.length}
          className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-semibold text-black disabled:opacity-50">
          {pending ? "Updating…" : "Smart Ranking #6 → #1"}
        </button>}
        {ranking && <button type="button" onClick={undoRanks} disabled={pending || !lastRanks}
          className="rounded-lg border border-black/15 px-3 py-2 text-xs disabled:opacity-40 dark:border-white/15">Undo ranks</button>}
        <button type="button" onClick={undoMove} disabled={pending || !lastMove}
          className="rounded-lg border border-black/15 px-3 py-2 text-xs disabled:opacity-40 dark:border-white/15">Undo last move</button>
        <button type="button" onClick={redoLastMove} disabled={pending || !redoMove}
          className="rounded-lg border border-black/15 px-3 py-2 text-xs disabled:opacity-40 dark:border-white/15">Redo move</button>
      </div>
      <p className="text-xs text-black/50 dark:text-white/50">
        Drag clips on desktop or select positions on mobile. Smart Ranking numbers clips in playback order without changing files.
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
