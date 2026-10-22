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

  const durations = clips.map(clip =>
    clip.trim_start != null && clip.trim_end != null && clip.trim_end > clip.trim_start
      ? clip.trim_end - clip.trim_start : null,
  );
  const knownDuration = durations.reduce<number>((sum, duration) => sum + (duration ?? 0), 0);
  const hasUnknownDuration = durations.some(duration => duration == null);

  return (
    <div className="space-y-3">
      {!!clips.length && (
        <section aria-label="Video timeline" className="rounded-xl border border-black/10 p-3 dark:border-white/15">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Video timeline · {clips.length} scenes</h3>
            <span className="text-xs tabular-nums text-black/55 dark:text-white/55">
              {hasUnknownDuration ? `Known duration ${knownDuration.toFixed(1)}s + unmeasured clips` : `Total ${knownDuration.toFixed(1)}s`}
            </span>
          </div>
          <div className="flex min-h-16 gap-1 overflow-x-auto pb-1" role="list" aria-label="Clip order">
            {clips.map((clip, index) => (
              <div key={clip.id} role="listitem" title={clip.title}
                style={{ flexGrow: durations[index] ?? 3, flexBasis: "76px" }}
                className="min-w-[76px] overflow-hidden rounded-lg border border-amber-500/30 bg-amber-400/10 px-2 py-2">
                <p className="truncate text-xs font-semibold">{ranking && clip.number != null ? `#${clip.number} · ` : ""}{index + 1}. {clip.title}</p>
                <p className="mt-1 text-[11px] tabular-nums text-black/55 dark:text-white/55">
                  {durations[index] == null ? "Duration unknown" : `${durations[index]!.toFixed(1)}s`}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-black/50 dark:text-white/50">Segment widths reflect known durations. Reorder scenes below; trim inside each clip.</p>
        </section>
      )}
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
            <ClipRow projectId={projectId} clip={clip} isFirst={index === 0} isLast={index === clips.length - 1} ranking={ranking} />
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
