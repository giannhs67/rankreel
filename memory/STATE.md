## Current status

M0, M1, and M2 are done and verified against a real local Supabase instance (Docker, `supabase
start`). You can: log in, create a project, upload a real video file (uploaded straight from the
browser to the `clips` Storage bucket), see it listed, reorder clips, edit title/number inline, and
delete a clip (which removes both the DB row and the Storage object). All of this was driven through
a real headless browser (Playwright), not just curl/build checks — see `memory/DECISIONS.md` for why
curl doesn't work for anything using a Server Action form.

No Remotion, no rendering, no templates yet — clips are just stored and organized. Next real feature
work is M3 (Ranking List Remotion composition + live preview).

## Last session (2026-07-31)

- Did:
  - Added `shared/types.ts` (Project/Clip/Template/Job types matching the migration).
  - Built the project dashboard (`app/page.tsx` + `app/actions.ts` + `app/new-project-form.tsx`):
    create a project via Server Action, list existing projects.
  - Built the project detail page (`app/projects/[id]/page.tsx`) with:
    - `clip-upload-form.tsx` — client component that uploads the file directly to Supabase Storage
      (bucket `clips`, path `${projectId}/${uuid}.${ext}`) via the browser Supabase client, then
      calls the `addClip` Server Action to insert the DB row (avoids proxying large video files
      through a Server Action's body).
    - `clip-row.tsx` — inline edit (title/number), reorder (swap `order_index` with neighbor via
      Server Actions), delete (removes Storage object + DB row). Added `data-testid="clip-row"` /
      `data-clip-id` attributes for stable test targeting (the row's visible text changes once it
      flips into edit mode, which broke naive text-based test selectors).
    - `app/projects/[id]/actions.ts` — `addClip`, `updateClip`, `deleteClip`, `moveClip`.
  - Added `components/app-header.tsx` (shared nav + sign-out), reused on both the dashboard and
    project pages.
  - Fixed two `@next/next/no-html-link-for-pages` lint errors (needed `next/link`, not `<a>`).
  - Verified end-to-end with a Playwright script: login → create project → upload 2 real `.mp4`
    files (from the sibling `watermark-remover/` sample clips) → confirmed list + order → reordered
    → edited a title → deleted a clip → confirmed removal from **both** the clips list and, via
    direct Storage/Postgres queries, actually gone from the `clips` bucket and the `clips` table (not
    just hidden in the UI). Cleaned up all test-generated projects/files afterward.
- Decisions: see `memory/DECISIONS.md`.
- Broke / known issues: none currently known. Still no hosted Supabase project / Vercel deploy.

## Next up (in priority order)

1. M3 — Ranking List Remotion composition: install Remotion, port the ranking-list layout (blurred
   top bar, multi-color title, 1..N list that reveals per clip, letterboxed video) as a
   `<Composition>` driven by a project's clips, add an in-app live preview via Remotion Player.
2. Eventually: hosted Supabase project + Vercel deploy (still not blocking local dev).

## Open questions for the owner

- Remotion Lambda (AWS) vs. a self-hosted render worker (Railway/Render/Fly) for M5 — spec recommends
  Lambda, confirm before wiring AWS credentials. Not needed yet for M3 (local preview only).
- When you're ready to deploy for real: hosted Supabase project region/naming preference?
