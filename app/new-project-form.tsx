"use client";

import { useActionState } from "react";
import { createProject } from "./actions";

export function NewProjectForm() {
  const [state, formAction, pending] = useActionState(createProject, undefined);

  return (
    <form action={formAction} className="space-y-2">
      <div className="flex gap-2">
        <input
          name="name"
          placeholder="Project name"
          required
          className="flex-1 rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create"}
        </button>
      </div>
      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
    </form>
  );
}
