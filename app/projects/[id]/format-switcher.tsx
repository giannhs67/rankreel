"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { CompositionFormat } from "@/shared/types";
import { changeProjectFormat } from "./actions";

const formats: { value: CompositionFormat; label: string; detail: string }[] = [
  { value: "ranking_list", label: "Ranking / Top 6", detail: "Ranked list + countdown" },
  { value: "caption", label: "Story / Captions", detail: "On-screen story captions" },
  { value: "title_banner", label: "Title / Highlights", detail: "Large title over footage" },
];

export function FormatSwitcher({
  projectId, currentFormat, clipCount,
}: { projectId: string; currentFormat: CompositionFormat; clipCount: number }) {
  const router = useRouter();
  const [target, setTarget] = useState<CompositionFormat>(currentFormat);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function apply() {
    if (pending || target === currentFormat) return;
    setError(null);
    startTransition(async () => {
      try {
        await changeProjectFormat(projectId, target);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not change video format.");
      }
    });
  }

  return (
    <section className="space-y-3 rounded-2xl border border-black/10 bg-black/[.025] p-4 dark:border-white/15 dark:bg-white/[.03]">
      <div>
        <h2 className="text-base font-semibold">Video format</h2>
        <p className="mt-1 text-xs text-black/55 dark:text-white/55">
          Change the actual preview and export layout without re-uploading clips. Your old style is kept, but each format uses its own design.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {formats.map(format => (
          <label key={format.value} className={`cursor-pointer rounded-xl border p-3 transition ${target === format.value ? "border-amber-400 bg-amber-400/10" : "border-black/15 dark:border-white/15"}`}>
            <input type="radio" name="project-format" value={format.value} checked={target === format.value}
              onChange={() => { setTarget(format.value); setError(null); }} className="accent-amber-500" />
            <span className="ml-2 text-sm font-semibold">{format.label}</span>
            <span className="mt-1 block text-xs text-black/55 dark:text-white/55">{format.detail}</span>
          </label>
        ))}
      </div>
      {target === "ranking_list" && clipCount > 6 && (
        <p className="text-xs text-amber-600 dark:text-amber-300" role="alert">
          Ranking supports 6 clips maximum. You currently have {clipCount}; remove extra clips to switch.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={apply}
          disabled={pending || target === currentFormat || (target === "ranking_list" && clipCount > 6)}
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-40">
          {pending ? "Changing…" : "Apply format"}
        </button>
        <span className="text-xs text-black/50 dark:text-white/50">
          Existing clips and trims stay unchanged. Changes affect future renders.
        </span>
      </div>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </section>
  );
}
