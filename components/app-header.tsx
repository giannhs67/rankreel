import Link from "next/link";

export function AppHeader({ email }: { email: string }) {
  return (
    <header className="flex items-center justify-between border-b border-black/10 px-6 py-4 dark:border-white/10">
      <Link href="/" className="font-semibold">
        Short Tube
      </Link>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-black/60 dark:text-white/60">{email}</span>
        <form action="/logout" method="post">
          <button
            type="submit"
            className="rounded-md border border-black/15 px-3 py-1.5 dark:border-white/15"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
