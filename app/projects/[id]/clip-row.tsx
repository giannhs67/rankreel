"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Clip } from "@/shared/types";
import { deleteClip, moveClip, updateClip } from "./actions";

export function ClipRow({
  projectId,
  clip,
  isFirst,
  isLast,
}: {
  projectId: string;
  clip: Pick<Clip, "id" | "title" | "number" | "storage_path" | "trim_start" | "trim_end">;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  function move(direction: "up" | "down") {
    setActionError(null);
    startTransition(async () => {
      try {
        await moveClip(projectId, clip.id, direction);
        router.refresh();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Could not move clip.");
      }
    });
  }

  function remove() {
    if (!confirm(`Delete clip "${clip.title}"?`)) return;
    setActionError(null);
    startTransition(async () => {
      try {
        await deleteClip(projectId, clip.id, clip.storage_path);
        router.refresh();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Could not delete clip.");
      }
    });
  }

  if (editing) {
    return (
      <div
        data-testid="clip-row"
        data-clip-id={clip.id}
        className="rounded-md border border-black/10 p-3 dark:border-white/10"
      >
        <form
          action={async (formData) => {
            setActionError(null);
            startTransition(async () => {
              try {
                await updateClip(projectId, clip.id, formData);
                setEditing(false);
                router.refresh();
              } catch (error) {
                setActionError(error instanceof Error ? error.message : "Could not save clip.");
              }
            });
          }}
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
        >
          <input
            name="title"
            defaultValue={clip.title}
            required
            className="flex-1 rounded-md border border-black/15 bg-transparent px-3 py-1.5 text-sm dark:border-white/15"
          />
          <input
            name="number"
            type="number"
            defaultValue={clip.number ?? ""}
            className="w-20 rounded-md border border-black/15 bg-transparent px-3 py-1.5 text-sm dark:border-white/15"
          />
          <input
            name="trim_start"
            type="number"
            step="0.1"
            min="0"
            placeholder="Trim start (s)"
            defaultValue={clip.trim_start ?? ""}
            className="w-28 rounded-md border border-black/15 bg-transparent px-3 py-1.5 text-sm dark:border-white/15"
          />
          <input
            name="trim_end"
            type="number"
            step="0.1"
            min="0"
            placeholder="Trim end (s)"
            defaultValue={clip.trim_end ?? ""}
            className="w-28 rounded-md border border-black/15 bg-transparent px-3 py-1.5 text-sm dark:border-white/15"
          />
          {actionError && <p role="alert" className="w-full text-sm text-red-600 dark:text-red-400">{actionError}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-black/15 px-3 py-1.5 text-sm dark:border-white/15"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div
      data-testid="clip-row"
      data-clip-id={clip.id}
      className="flex flex-col gap-3 rounded-xl border border-black/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-white/10"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {clip.number != null && <span className="text-black/40 dark:text-white/40">#{clip.number} </span>}
          {clip.title || <span className="italic text-black/40 dark:text-white/40">Untitled</span>}
        </p>
        {clip.trim_start != null && clip.trim_end != null && (
          <p className="text-xs text-black/40 dark:text-white/40">
            {(clip.trim_end - clip.trim_start).toFixed(1)}s ({clip.trim_start.toFixed(1)}s –{" "}
            {clip.trim_end.toFixed(1)}s)
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isFirst || pending}
          onClick={() => move("up")}
          className="rounded-md border border-black/15 px-2 py-1 text-xs disabled:opacity-30 dark:border-white/15"
          aria-label="Move up"
        >
          ↑
        </button>
        <button
          type="button"
          disabled={isLast || pending}
          onClick={() => move("down")}
          className="rounded-md border border-black/15 px-2 py-1 text-xs disabled:opacity-30 dark:border-white/15"
          aria-label="Move down"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md border border-black/15 px-2 py-1 text-xs dark:border-white/15"
        >
          Edit
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={remove}
          className="rounded-md border border-red-600/30 px-2 py-1 text-xs text-red-600 dark:text-red-400"
        >
          Delete
        </button>
      </div>
      {actionError && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{actionError}</p>}
    </div>
  );
}
