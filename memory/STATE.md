## Current status

M0 + M1 are code-complete locally. Next.js 16 app with a full auth loop: `proxy.ts` guards every route
except `/login`, `/login` signs in via a Server Action against Supabase Auth, `/` shows the signed-in
owner's email with a working sign-out form, and `scripts/create-owner.mjs` /
`scripts/reset-password.mjs` manage the single owner account via the service-role key. None of this
has been exercised against a **real** Supabase project yet — there isn't one wired up. Verified so far:
`npm run build`, `npm run dev`, and `npm run lint` all succeed, and hitting `/` or `/login` without
real Supabase env vars fails with Supabase's own clear "URL and Key are required" error (expected —
proves the wiring is correct, not that auth actually works yet).

## Last session (2026-07-31)

- Did:
  - M0 (previous session): scaffolded Next.js 16, repo layout, Supabase migration, memory files.
  - M1 (this session): added `@supabase/supabase-js` + `@supabase/ssr`; wrote
    `lib/supabase/{server,client,proxy}.ts`; wrote root `proxy.ts` (Next 16's replacement for
    `middleware.ts`) which redirects unauthenticated requests to `/login` and authenticated ones away
    from it; built `/login` (Server Action + `useActionState` form) and `/logout` (POST Route
    Handler); rewrote the placeholder homepage to show the signed-in user + a real sign-out form;
    wrote `scripts/create-owner.mjs` and `scripts/reset-password.mjs` (both use
    `auth.admin.*` with the service-role key, take email/password as CLI args or
    `OWNER_EMAIL`/`OWNER_PASSWORD` env vars); wired both into `package.json` via
    `node --env-file=.env.local`; updated README/CONTRIBUTING with the exact self-hosting steps
    (create project → migrate → create-owner → disable signups → dev/deploy).
- Decisions: see `memory/DECISIONS.md`.
- Broke / known issues:
  - Still no real Supabase project — auth is wired but functionally untested end-to-end. Whoever
    picks this up next should create one, fill `.env.local`, run the migration, run `create-owner`,
    and click through `/login` → `/` → sign out once for real before trusting this milestone fully.
  - Not deployed to Vercel yet.

## Next up (in priority order)

1. Owner creates a Supabase project, fills `.env.local`, runs `supabase/migrations/0001_init.sql`,
   runs `npm run create-owner`, disables public signups, and does one real login/logout pass locally.
2. Deploy to Vercel with the same env vars (closes out the last M0 checkbox).
3. Start M2 — Upload & project: upload clips to Supabase Storage, create project, list/reorder clips,
   set title + number per clip.

## Open questions for the owner

- Remotion Lambda (AWS) vs. a self-hosted render worker (Railway/Render/Fly) for M5 — spec recommends
  Lambda, confirm before wiring AWS credentials.
- Any preference on Supabase project region / naming before it's created?
