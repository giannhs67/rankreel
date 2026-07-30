## Current status

M0 and M1 are done and **verified against a real (local) Supabase instance** — not just code-complete.
Local Supabase runs via Docker (`supabase start`, project_id `rankreel`); `.env.local` points at it.
Auth works end-to-end: `proxy.ts` redirects logged-out requests to `/login`, login via Server Action
works, the home page shows the signed-in owner, sign-out works. Verified with a scripted Playwright
run (screenshots + console-error check), not just `curl`/build checks. Now starting M2 (upload &
projects).

## Last session (2026-07-31)

- Did:
  - Ran `supabase init` + `supabase start` in `rankreel/` — local Docker stack (Postgres, Auth,
    Storage, Studio, etc.) is up, project_id `rankreel`. `0001_init.sql` applied automatically on
    start.
  - Filled `.env.local` with the local stack's URL + anon/service-role JWTs (Supabase's well-known
    local dev demo keys — same on every machine, not secrets). Local endpoints: API
    `http://127.0.0.1:54321`, Studio `http://127.0.0.1:54323`, DB `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.
  - Ran `npm run create-owner` → created `owner@rankreel.local` / `dev-owner-password-change-me`
    (**local dev credentials only** — change via `npm run reset-password` before this ever points at
    a real/hosted project).
  - Verified the full auth loop with a one-off Playwright script (chromium, headless): logged-out `/`
    redirects to `/login`; login succeeds and lands on `/`; home page shows
    "Signed in as owner@rankreel.local"; sign-out redirects back to `/login`. No console errors.
    Screenshots confirm the UI actually renders (not just correct HTTP codes).
  - Note: curl can't drive this login form — it's a React Server Action, which requires the
    browser's `Next-Action` invocation protocol, not a plain form POST. Use a real browser (or
    Playwright) to test anything past this point that involves a Server Action form.
- Decisions: see `memory/DECISIONS.md`.
- Broke / known issues:
  - Still no *hosted* Supabase project or Vercel deployment — everything so far is local-only.
  - The owner password above is a placeholder committed nowhere but worth rotating once this stops
    being purely local.

## Next up (in priority order)

1. M2 — Upload & project: create project, upload clips to the `clips` Storage bucket, list/reorder
   clips, edit title + number per clip.
2. Eventually: hosted Supabase project + Vercel deploy to close the last M0 checkbox (not blocking
   M2+ local development).

## Open questions for the owner

- Remotion Lambda (AWS) vs. a self-hosted render worker (Railway/Render/Fly) for M5 — spec recommends
  Lambda, confirm before wiring AWS credentials.
- When you're ready to deploy for real: hosted Supabase project region/naming preference?
