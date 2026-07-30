## Current status

M0–M3 are done and verified against a real local Supabase instance (Docker, `supabase start`). You
can: log in, create a project, upload real video files, reorder/edit/delete clips, and now **preview
the actual Ranking List composition** at `/projects/[id]/preview` — a live Remotion Player showing
the blurred backdrop, the progressively-revealed numbered list, and the letterboxed current clip,
driven by real uploaded footage via signed Supabase Storage URLs.

Not yet built: the Konva text/position editor (M4), actual MP4 export via Remotion Lambda (M5),
templates (M6), batch (M7), the other two composition formats (M8). Per-clip duration in the preview
is a fixed 4s placeholder until real trimming exists.

## Last session (2026-07-31, continued)

- Did (M3):
  - Installed `remotion` + `@remotion/player` (deps) and `@remotion/cli` (devDep) — all cleanly
    support React 19 / Next 16, no version conflicts.
  - `remotion/RankingList.tsx`: the composition. Top zone (900px of a 1080x1920 frame) shows a
    blurred/scaled backdrop of whichever clip is currently playing (via `<Video filter="blur(40px)
    brightness(0.5)">`) with the ranking list overlaid — rows for clips *not yet reached* start at
    `opacity: 0`, current clip's row is enlarged + highlighted yellow. Bottom zone uses `<Series>` to
    switch between clips' `<Video>` at the right frame, letterboxed via `maxWidth/maxHeight: 100%`.
    Clip order in props is #N-first → #1-last (matches DB `order_index` ascending == upload order),
    which lines up directly with top-to-bottom row order — no reversal needed.
  - `remotion/Root.tsx` + `remotion/index.ts`: standard Remotion entry point (`registerRoot`),
    registers the `RankingList` composition with `calculateMetadata` so duration adapts to however
    many clips/durations are passed in. Added `npm run remotion:studio` for contributors to open
    Remotion Studio directly against this composition (`remotion studio remotion/index.ts`).
  - `/projects/[id]/preview` (Server Component): loads the project's clips, generates a **signed**
    Supabase Storage URL per clip (30 min TTL — bucket is private, RLS-protected), maps
    `trim_start`/`trim_end` to a duration when set, else falls back to a 4s placeholder. Passes all
    of that into `<RankingPreviewPlayer>` (client component wrapping `@remotion/player`'s `<Player>`).
  - Added a "Preview" button on the project detail page (only shown once there's at least one clip).
  - Verified with Playwright: uploaded 3 real clips (#5, #4, #3), opened the preview, confirmed
    `<video>` elements actually mount, clicked the Player's real "Play video" button (not a guessed
    selector — had to inspect the DOM to find it), watched the timer advance from 0:00 → 0:06 of
    0:12 total, and confirmed on-screen that "#5 Fifth place" alone was shown early on and "#4 Fourth
    place" (highlighted) joined it once playback crossed the first clip's boundary — i.e. the
    progressive reveal actually works with real footage, not just in theory. Screenshot evidence in
    the session transcript. No console/network errors. Cleaned up all test-generated data afterward.
- Decisions: see `memory/DECISIONS.md`.
- Broke / known issues: none currently known.

## Next up (in priority order)

1. M4 — Text editor (Konva): move/place text layers, per-phrase color, stroke/outline, font
   size/import, entrance animations (pop/slide/fade), persisted to `templates.config_json`. This is
   also where real per-clip trimming (setting `trim_start`/`trim_end`) should probably land, since
   the preview's 4s placeholder duration is a known gap until then.
2. Eventually: hosted Supabase project + Vercel deploy (still not blocking local dev work).

## Open questions for the owner

- Remotion Lambda (AWS) vs. a self-hosted render worker (Railway/Render/Fly) for M5 — spec recommends
  Lambda, confirm before wiring AWS credentials. Still not needed for M4.
- When you're ready to deploy for real: hosted Supabase project region/naming preference?
