# RankReel — Decisions log (append-only)

One line per non-obvious choice, with the reason. Newest at the bottom.

- **2026-07-31** — Project named **RankReel** (was "ShortsForge" in the original kickoff draft).
  Owner's choice when setting up the open-source repo; leans into the flagship Ranking List format.
- **2026-07-31** — License: **MIT**. Owner chose permissive over AGPL/GPL to minimize contribution
  friction; this is a self-hosted tool, not a service the maintainer runs, so the "SaaS clone"
  concern AGPL addresses was judged not to apply strongly enough to be worth the friction.
- **2026-07-31** — Project repo lives at `tool/rankreel/` as its own git repo, separate from the
  unrelated `watermark-remover` Python tool that shares the parent `tool/` directory on disk.
- **2026-07-31** — Scaffolded with **Next.js 16.2.12** (latest via `create-next-app`) rather than
  pinning to an older well-known version. Consequence: `middleware.ts` does not exist in this
  version — it's been renamed to `proxy.ts` (same behavior, see CLAUDE.md). Any future session
  should verify APIs against `node_modules/next/dist/docs/` rather than assuming pre-16 conventions.
- **2026-07-31** — Left `npm audit`'s 12 high-severity advisories unfixed rather than running
  `npm audit fix --force`. The forced fix would downgrade `next` to `9.3.3` because the vulnerable
  `postcss`/`sharp`/`minimatch` versions are bundled transitively inside `next@16.2.12` itself — the
  suggested fix is not a real fix. Revisit when upstream Next.js patches these in a 16.x release.
- **2026-07-31** — Storage RLS policies use `auth.uid() is not null` rather than a per-user path
  prefix. Justified because this is explicitly a single-owner app (ClaudePrompt.md §3) — there is
  only ever one authenticated user per deployment, so "authenticated" and "is the owner" are
  equivalent. Would need revisiting if multi-user support were ever added (it's explicitly out of
  scope per the guardrails).
- **2026-07-31** — `create-owner`/`reset-password` scripts are plain `.mjs` (not TypeScript) run via
  `node --env-file=.env.local`, instead of adding `tsx`/`ts-node` as a dependency. Node 24 (in use)
  supports `--env-file` natively; these scripts are simple enough that skipping a TS toolchain for
  them isn't a real loss, and it's one fewer dependency for contributors to reason about.
- **2026-07-31** — Disabling public signups in Supabase and creating the owner account are documented
  manual steps (README/CONTRIBUTING), not automated. There's no Supabase Management API call that's
  simpler than clicking the dashboard toggle, and scripting Supabase project-level auth config would
  need a personal access token with broader scope than the service-role key already in `.env.local`.
- **2026-07-31** — Development happens against a **local** Supabase instance (`supabase init` +
  `supabase start`, Docker), not a hosted project. Local dev keys in `.env.local` are Supabase's
  well-known local demo JWTs (identical on every machine running `supabase start` — not secrets, safe
  in a local-only `.env.local`). "Disable public signups" doesn't apply locally since the local stack
  isn't reachable from the public internet; that step is deferred until there's a hosted project.
- **2026-07-31** — Auth was verified with a throwaway Playwright script (chromium, headless) run
  outside the repo, rather than `curl`. Reason: the login form is a React Server Action, invoked via
  the browser's `Next-Action` protocol — a plain `curl -d` POST to `/login` just re-renders the page
  and silently does nothing. Any future manual/automated test of a Server-Action-backed form needs a
  real browser (Playwright etc.), not curl.
