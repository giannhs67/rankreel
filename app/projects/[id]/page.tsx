import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { ClipUploadForm } from "./clip-upload-form";
import { SortableClipList } from "./sortable-clip-list";
import { RenderPanel } from "./render-panel";
import { StudioControls } from "./studio-controls";
import { CreatorTools } from "./creator-tools";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, format")
    .eq("id", id)
    .single();

  if (!project) notFound();

  const { data: clips } = await supabase
    .from("clips")
    .select("id, title, number, storage_path, trim_start, trim_end")
    .eq("project_id", id)
    .order("order_index", { ascending: true });

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, status, progress, output_path, error, created_at")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email ?? ""} />
      <main className="mx-auto max-w-4xl space-y-8 px-4 py-6 sm:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <Link href="/" className="text-sm text-black/50 hover:underline dark:text-white/50">
              ← Projects
            </Link>
            <h1 className="mt-1 text-xl font-semibold">{project.name}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/projects/${project.id}/editor`}
              className="rounded-md border border-black/15 px-4 py-2 text-sm dark:border-white/15"
            >
              Style
            </Link>
            {!!clips?.length && (
              <Link
                href={`/projects/${project.id}/preview`}
                className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
              >
                Preview
              </Link>
            )}
          </div>
        </div>

        {project.format === "ranking_list" ? (
          <section className="space-y-3 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-amber-500">Dedicated workspace</p>
                <h2 className="text-xl font-bold">Ranking Studio</h2>
                <p className="text-sm text-black/60 dark:text-white/60">Numbered clips, countdown layout, ranking effects and preview. The existing composition uses a six-position layout.</p>
              </div>
              <span className="rounded-lg bg-amber-400 px-3 py-1 text-xs font-bold text-black">RANKING</span>
            </div>
            <StudioControls projectId={project.id} ranking />
          </section>
        ) : (
          <section className="space-y-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-500">General workspace</p>
              <h2 className="text-xl font-bold">Video Editor</h2>
              <p className="text-sm text-black/60 dark:text-white/60">Build your story or edit your footage scene by scene.</p>
            </div>
            <StudioControls projectId={project.id} />
          </section>
        )}

        <CreatorTools projectId={project.id} clips={clips ?? []} ranking={project.format === "ranking_list"} />

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
            {project.format === "ranking_list" ? "Add a ranking clip" : "Add a video scene"}
          </h2>
          {project.format === "ranking_list" && (clips?.length ?? 0) >= 6 ? (
            <p className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-sm">
              All six ranking positions are filled. Edit, reorder or remove a clip to change the list.
            </p>
          ) : (
            <ClipUploadForm projectId={project.id} nextRankingNumber={project.format === "ranking_list" ? Math.max(1, 6 - (clips?.length ?? 0)) : 0} />
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
            {project.format === "ranking_list" ? `Ranking clips (${clips?.length ?? 0}; six suggested)` : `Video scenes (${clips?.length ?? 0})`}
          </h2>
          {!clips?.length && (
            <p className="text-sm text-black/50 dark:text-white/50">
              No clips yet — upload one above.
            </p>
          )}
          <SortableClipList projectId={project.id} clips={clips ?? []} />
        </section>

        {!!clips?.length && (
          <section>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
              Render
            </h2>
            <RenderPanel projectId={project.id} initialJobs={jobs ?? []} />
          </section>
        )}
      </main>
    </div>
  );
}
