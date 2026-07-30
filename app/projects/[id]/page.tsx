import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { ClipUploadForm } from "./clip-upload-form";
import { ClipRow } from "./clip-row";
import { RenderPanel } from "./render-panel";

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
      <main className="mx-auto max-w-2xl space-y-8 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href="/" className="text-sm text-black/50 hover:underline dark:text-white/50">
              ← Projects
            </Link>
            <h1 className="mt-1 text-xl font-semibold">{project.name}</h1>
          </div>
          <div className="flex shrink-0 gap-2">
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

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
            Add a clip
          </h2>
          <ClipUploadForm projectId={project.id} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
            Clips ({clips?.length ?? 0})
          </h2>
          {!clips?.length && (
            <p className="text-sm text-black/50 dark:text-white/50">
              No clips yet — upload one above.
            </p>
          )}
          <ul className="space-y-2">
            {clips?.map((clip, i) => (
              <ClipRow
                key={clip.id}
                projectId={project.id}
                clip={clip}
                isFirst={i === 0}
                isLast={i === (clips?.length ?? 1) - 1}
              />
            ))}
          </ul>
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
