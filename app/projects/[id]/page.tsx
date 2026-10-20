import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { ClipUploadForm } from "./clip-upload-form";
import { SortableClipList } from "./sortable-clip-list";
import { RenderPanel } from "./render-panel";
import { StudioControls } from "./studio-controls";

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
    .select("id, name")
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

        <StudioControls projectId={project.id} />

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
            Add a clip
          </h2>
          <ClipUploadForm projectId={project.id} nextRankingNumber={Math.max(1, 6 - (clips?.length ?? 0))} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
            Clips ({clips?.length ?? 0}/6 recommended for Top 6)
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
