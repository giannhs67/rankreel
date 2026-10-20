import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/app-header";
import { NewProjectForm } from "./new-project-form";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email ?? ""} />
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:p-8">
        <section>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-black/50 dark:text-white/50">Creator studio</p>
          <h1 className="mb-2 text-3xl font-bold tracking-tight">Create your next Short</h1>
          <p className="mb-5 text-sm text-black/60 dark:text-white/60">Build a Top 6 ranking, preview it, then render on your Windows PC.</p>
          <NewProjectForm />
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Projects</h2>
            <Link
              href="/batch"
              className="text-sm text-black/50 hover:underline dark:text-white/50"
            >
              Batch render →
            </Link>
          </div>
          {!projects?.length && (
            <p className="text-sm text-black/50 dark:text-white/50">
              No projects yet — create one above.
            </p>
          )}
          <ul className="grid gap-3 sm:grid-cols-2">
            {projects?.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className="block rounded-xl border border-black/10 bg-black/[.02] p-5 font-medium transition hover:bg-black/[.06] dark:border-white/10 dark:bg-white/[.03] dark:hover:bg-white/[.08]"
                >
                  {project.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
