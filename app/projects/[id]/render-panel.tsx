"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Job } from "@/shared/types";

type JobRow = Pick<Job, "id" | "status" | "progress" | "output_path" | "error" | "created_at">;

const POLL_INTERVAL_MS = 2000;

export function RenderPanel({
  projectId,
  initialJobs,
}: {
  projectId: string;
  initialJobs: JobRow[];
}) {
  const [jobs, setJobs] = useState<JobRow[]>(initialJobs);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const jobsRef = useRef(jobs);
  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  // Polling, not Supabase Realtime: self-hosted local Realtime's postgres_changes didn't
  // deliver events reliably in this environment (verified even a service-role-key
  // subscription with no RLS involved received nothing during an active job). Polling is
  // simple and fully reliable for a single-owner tool — see memory/DECISIONS.md.
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
        .select("id, status, progress, output_path, error, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (!cancelled && data) setJobs(data);
    }

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [projectId]);

  async function handleRender() {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, studioSettings: (() => { try { const raw = localStorage.getItem(`short-tube-studio-${projectId}`); return raw ? JSON.parse(raw) : null; } catch { return null; } })() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to start render.");
        return;
      }

      setJobs((prev) => [
        {
          id: data.jobId,
          status: "queued",
          progress: 0,
          output_path: null,
          error: null,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start render.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleRender}
        disabled={starting || jobs.some(j => j.status === "queued" || j.status === "rendering")}
        className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-60"
      >
        {starting ? "Starting…" : jobs.some(j => j.status === "queued" || j.status === "rendering") ? "Render in progress…" : "Render MP4 (local)"}
      </button>
      <p className="text-xs text-black/50 dark:text-white/50">Renders on your Windows computer. Check the preview before exporting; no automatic publishing.</p>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {jobs.length > 0 && (
        <ul className="space-y-2">
          {jobs.map((job) => (
            <li
              key={job.id}
              data-testid="job-row"
              data-job-id={job.id}
              data-job-status={job.status}
              className="flex items-center justify-between gap-3 rounded-md border border-black/10 px-4 py-3 text-sm dark:border-white/10"
            >
              <div className="min-w-0">
                <p className="font-medium capitalize">{job.status}</p>
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
    </div>
  );
}
