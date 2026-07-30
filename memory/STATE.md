## Current status

M0 skeleton exists locally: Next.js 16 (App Router, TS, Tailwind v4) scaffolded, repo layout in place
(`/app /remotion /worker /shared /supabase /scripts /memory`), Supabase SQL migration written
(`supabase/migrations/0001_init.sql` — tables + RLS + storage bucket policies), and the memory/roadmap
files exist. Nothing is deployed yet, and there is no live Supabase project wired up — the app runs
locally with placeholder/no env vars and shows only the Next.js default homepage. No auth, no upload,
no rendering yet.

## Last session (2026-07-31)

- Did:
  - Scaffolded Next.js (App Router + TS + Tailwind v4 + ESLint) via `create-next-app`, merged into
    the existing `rankreel/` repo alongside the OSS docs (README/LICENSE/CONTRIBUTING/etc. from the
    open-source setup pass earlier the same day).
  - Created `/remotion /worker /shared /supabase/migrations /scripts /memory` directories.
  - Wrote `supabase/migrations/0001_init.sql`: `templates`, `projects`, `clips`, `jobs` tables, RLS
    policies (`owner_id = auth.uid()`), Realtime on `jobs`, and storage bucket + policy setup for
    `clips` / `renders` / `fonts` (private, owner-only via `auth.uid() is not null` since it's a
    single-owner app).
  - Created `CLAUDE.md`, `ROADMAP.md` (M0–M10 checklist), this file, and `memory/DECISIONS.md`.
- Decisions: see `memory/DECISIONS.md`.
- Broke / known issues:
  - `npm audit` reports 12 high-severity advisories, all nested inside `next@16.2.12`'s own dependency
    tree (eslint's minimatch, postcss, sharp/libvips). No non-breaking fix exists yet — see DECISIONS.
  - No Supabase project exists yet — nothing has been run against a real database.
  - Not deployed to Vercel — needs the project owner's Vercel account.

## Next up (in priority order)

1. Owner creates a Supabase project, fills in `.env.local` from `.env.example`, and runs
   `supabase/migrations/0001_init.sql` against it (via Supabase SQL editor or CLI).
2. Owner connects the repo to Vercel (or runs `vercel` locally) and sets the same env vars there, to
   close out the remaining M0 checkboxes.
3. Start M1: Supabase Auth (email+password, signups disabled), `create-owner` script,
   `proxy.ts` route guard (NOT `middleware.ts` — see CLAUDE.md), `/login` + `/logout`,
   `reset-password` script.

## Open questions for the owner

- Remotion Lambda (AWS) vs. a self-hosted render worker (Railway/Render/Fly) for M5 — spec recommends
  Lambda, confirm before wiring AWS credentials.
- Any preference on Supabase project region / naming before it's created?
