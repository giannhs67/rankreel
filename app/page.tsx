import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy.ts already guards this route; this redirect only covers direct
  // server-side renders where the proxy hasn't run (e.g. static export edge cases).
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-16">
      <h1 className="text-2xl font-semibold">RankReel</h1>
      <p className="text-black/60 dark:text-white/60">
        Signed in as <span className="font-medium">{user.email}</span>.
      </p>
      <p className="max-w-md text-center text-sm text-black/50 dark:text-white/50">
        M1 (auth) is done. Projects, uploads, and templates land in M2+ — see{" "}
        <code>ROADMAP.md</code>.
      </p>
      <form action="/logout" method="post">
        <button
          type="submit"
          className="rounded-md border border-black/15 px-4 py-2 text-sm dark:border-white/15"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
