import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { BatchPanel } from "./batch-panel";

export default async function BatchPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, format, clips(count)")
    .order("created_at", { ascending: false });

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, project_id, status, progress, output_path, error, created_at, projects(name)")
    .order("created_at", { ascending: false })
    .limit(30);

  const projectList = (projects ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    format: p.format as string,
    clipCount: Array.isArray(p.clips) ? (p.clips[0]?.count ?? 0) : 0,
  }));

  const jobList = (jobs ?? []).map((j) => ({
    id: j.id,
    project_id: j.project_id,
    status: j.status,
    progress: j.progress,
    output_path: j.output_path,
    error: j.error,
    created_at: j.created_at,
    projectName: (j.projects as unknown as { name: string } | null)?.name ?? "(deleted project)",
  }));

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email ?? ""} />
      <main className="mx-auto max-w-3xl space-y-8 p-6">
        <div>
          <Link href="/" className="text-sm text-black/50 hover:underline dark:text-white/50">
            ← Projects
          </Link>
          <h1 className="mt-1 text-xl font-semibold">Batch render</h1>
          <p className="mt-1 text-sm text-black/50 dark:text-white/50">
            Select projects and render them all — one at a time, so local renders don&apos;t
            compete for CPU/GPU.
          </p>
        </div>

        <BatchPanel projects={projectList} initialJobs={jobList} />
      </main>
    </div>
  );
}
