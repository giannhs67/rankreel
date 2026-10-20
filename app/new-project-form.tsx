"use client";

import { useActionState } from "react";
import { createProject } from "./actions";

const FORMATS = [
  { value: "caption", label: "Storytelling / Mysteries", description: "Caption-based layout with narration" },
  { value: "title_banner", label: "Events / Facts", description: "Headline-led video stories" },
  { value: "ranking_list", label: "Rankings", description: "Top 5, Top 6 and countdowns" },
  { value: "caption", label: "Gaming Highlights", description: "Caption-based layout for gameplay" },
  { value: "title_banner", label: "Custom Video", description: "Title-banner layout with your footage" },
] as const;

export function NewProjectForm() {
  const [state, formAction, pending] = useActionState(createProject, undefined);

  return (
    <form action={formAction} className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="name"
          placeholder="Video title or project name"
          required
          className="min-w-0 flex-1 rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
        />
        <select
          name="format"
          defaultValue="caption"
          className="rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
        >
          {FORMATS.map((f) => (
            <option key={f.label} value={f.value}>
              {f.label} — {f.description}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create project"}
        </button>
      </div>
      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
    </form>
  );
}
