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
  clip: Pick<Clip, "id" | "title" | "number" | "storage_path">;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function move(direction: "up" | "down") {
    startTransition(async () => {
      await moveClip(projectId, clip.id, direction);
      router.refresh();
    });
  }

  function remove() {
    if (!confirm(`Delete clip "${clip.title}"?`)) return;
    startTransition(async () => {
      await deleteClip(projectId, clip.id, clip.storage_path);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <li
        data-testid="clip-row"
        data-clip-id={clip.id}
        className="rounded-md border border-black/10 p-3 dark:border-white/10"
      >
        <form
          action={async (formData) => {
            await updateClip(projectId, clip.id, formData);
            setEditing(false);
            router.refresh();
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
          <div className="flex gap-2">
            <button
              type="submit"
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
      </li>
    );
  }

  return (
    <li
      data-testid="clip-row"
      data-clip-id={clip.id}
      className="flex items-center justify-between gap-3 rounded-md border border-black/10 px-4 py-3 dark:border-white/10"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {clip.number != null && <span className="text-black/40 dark:text-white/40">#{clip.number} </span>}
          {clip.title || <span className="italic text-black/40 dark:text-white/40">Untitled</span>}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
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
    </li>
  );
}
