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
      <main className="mx-auto max-w-2xl space-y-8 p-6">
        <section>
          <h1 className="mb-4 text-lg font-semibold">New project</h1>
          <NewProjectForm />
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">Projects</h2>
          {!projects?.length && (
            <p className="text-sm text-black/50 dark:text-white/50">
              No projects yet — create one above.
            </p>
          )}
          <ul className="space-y-2">
            {projects?.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className="block rounded-md border border-black/10 px-4 py-3 hover:bg-black/[.03] dark:border-white/10 dark:hover:bg-white/[.03]"
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
