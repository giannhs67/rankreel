"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ProjectRow = { id: string; name: string; format: string; clipCount: number };
type JobRow = {
  id: string;
  project_id: string;
  status: string;
  progress: number;
  output_path: string | null;
  error: string | null;
  created_at: string;
  projectName: string;
};

const POLL_INTERVAL_MS = 2000;

export function BatchPanel({
  projects,
  initialJobs,
}: {
  projects: ProjectRow[];
  initialJobs: JobRow[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [jobs, setJobs] = useState<JobRow[]>(initialJobs);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const jobsRef = useRef(jobs);
  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function poll() {
      const hasActiveJob = jobsRef.current.some(
        (j) => j.status === "queued" || j.status === "rendering",
      );
      if (!hasActiveJob) return;

      const { data } = await supabase
        .from("jobs")
        .select("id, project_id, status, progress, output_path, error, created_at, projects(name)")
        .order("created_at", { ascending: false })
        .limit(30);

      if (!cancelled && data) {
        setJobs(
          data.map((j) => ({
            id: j.id,
            project_id: j.project_id,
            status: j.status,
            progress: j.progress,
            output_path: j.output_path,
            error: j.error,
            created_at: j.created_at,
            projectName: (j.projects as unknown as { name: string } | null)?.name ?? "(deleted project)",
          })),
        );
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleRenderSelected() {
    setStarting(true);
    setError(null);
    const newJobs: JobRow[] = [];

    for (const projectId of selected) {
      const project = projects.find((p) => p.id === projectId);
      try {
        const res = await fetch("/api/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError((prev) => `${prev ? prev + "; " : ""}${project?.name}: ${data.error}`);
          continue;
        }
        newJobs.push({
          id: data.jobId,
          project_id: projectId,
          status: "queued",
          progress: 0,
          output_path: null,
          error: null,
          created_at: new Date().toISOString(),
          projectName: project?.name ?? "",
        });
      } catch (err) {
        setError(
          (prev) =>
            `${prev ? prev + "; " : ""}${project?.name}: ${err instanceof Error ? err.message : "failed"}`,
        );
      }
    }

    setJobs((prev) => [...newJobs, ...prev]);
    setSelected(new Set());
    setStarting(false);
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
          Projects ({selected.size} selected)
        </h2>
        <ul className="space-y-2">
          {projects.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-md border border-black/10 px-4 py-3 text-sm dark:border-white/10"
            >
              <label className="flex min-w-0 items-center gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(p.id)}
                  disabled={p.clipCount === 0}
                  onChange={() => toggle(p.id)}
                />
                <span className="truncate">
                  {p.name}{" "}
                  <span className="text-black/40 dark:text-white/40">
                    ({p.format.replace("_", " ")}, {p.clipCount} clip{p.clipCount === 1 ? "" : "s"})
                  </span>
                </span>
              </label>
            </li>
          ))}
          {projects.length === 0 && (
            <p className="text-sm text-black/50 dark:text-white/50">No projects yet.</p>
          )}
        </ul>
        <button
          type="button"
          onClick={handleRenderSelected}
          disabled={selected.size === 0 || starting}
          className="mt-4 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
        >
          {starting ? "Starting…" : `Render ${selected.size || ""} selected`}
        </button>
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
          Jobs
        </h2>
        {jobs.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">No render jobs yet.</p>
        ) : (
          <ul className="space-y-2">
            {jobs.map((job) => (
              <li
                key={job.id}
                data-testid="batch-job-row"
                data-job-id={job.id}
                data-job-status={job.status}
                className="flex items-center justify-between gap-3 rounded-md border border-black/10 px-4 py-3 text-sm dark:border-white/10"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {job.projectName}{" "}
                    <span className="capitalize text-black/40 dark:text-white/40">
                      — {job.status}
                    </span>
                  </p>
                  {job.status === "rendering" && (
                    <div className="mt-1 h-1.5 w-40 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                      <div
                        className="h-full bg-foreground transition-all"
                        style={{ width: `${Math.round(job.progress * 100)}%` }}
                      />
                    </div>
                  )}
                  {job.status === "error" && (
                    <p className="text-xs text-red-600 dark:text-red-400">{job.error}</p>
                  )}
                </div>
                {job.status === "done" && (
                  <a
                    href={`/api/renders/${job.id}`}
                    className="shrink-0 rounded-md border border-black/15 px-3 py-1.5 text-xs dark:border-white/15"
                  >
                    Download
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
