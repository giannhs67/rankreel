## Current status

M0–M8 are all done (M9/M10 remain) and verified against a real local Supabase instance (Docker,
`supabase start`). RankReel can now go from "upload a clip" all the way to "download a real MP4," for
all three composition formats, one at a time or in a batch:

- **Ranking List** (M3/M4/M6): blurred backdrop, progressive numbered list, letterboxed clip, Konva
  drag-to-position editor, templates you can save and reuse across projects.
- **Title Banner** (M8): full-bleed clip with a single positioned title line.
- **Caption** (M8): full-bleed clip with a pill-style caption. Per-clip granularity, not true
  word-by-word — see DECISIONS.md.
- **Rendering** (M5, local — no AWS) and **batch rendering** (M7, `/batch`) both work, verified with
  real files, `ffprobe`, and extracted frames, not just "the UI didn't crash."

Every project declares its `format` at creation. Renders are serialized through an in-process queue
and share one long-lived headless Chromium instance (see below — this was a real bug, now fixed).

Not yet built: real cloud/Lambda rendering (open until there's an AWS account or a deploy target),
M9 URL ingestion, M10 polish.

## Last session (2026-07-31, continued — long session: M5 local, M8, M7)

This picks up right after M6. Summary of the M5(local)+M8 combined commit is already covered in the
prior STATE.md revision (now folded into ROADMAP.md's per-milestone detail); this entry covers M7 and
the bug it surfaced.

- Did (M7, batch rendering):
  - `/batch`: lists every project (name, format, clip count) with checkboxes, a "Render N selected"
    button that calls the existing `/api/render` once per selected project (no new render logic
    needed), and a live dashboard of the last 30 jobs across *all* projects (project name via a
    Supabase embedded join, status, progress bar, download link) — same 2s-polling pattern as the
    per-project render panel.
  - Added a render queue (`renderQueue`, a module-level `Promise` chain in
    `app/api/render/route.ts`) so batch-triggered renders don't run concurrently — each POST still
    creates its `jobs` row immediately (shows `queued`), but actual render work waits its turn.
  - **Found and fixed a real bug via this milestone's own testing**: the first 2-job batch render
    left 12 orphaned `chrome-headless-shell` processes and the second job failed with a Puppeteer
    "Session closed" error. Root cause: `worker/render.ts` let `selectComposition`/`renderMedia`
    each spin up their own Chromium instance (default behavior without `puppeteerInstance`). Fixed
    by lazily opening one `openBrowser("chrome")` instance and reusing it for every render in the
    process's lifetime — same pattern already used for caching the Remotion bundle. Re-verified: the
    identical 2-job batch then completed successfully, with the process tree staying to one coherent
    Chromium instance instead of accumulating (checked via `ps -eo pid,ppid,comm`).
  - Verified end-to-end: created 2 projects with clips, selected both on `/batch`, rendered, watched
    via direct DB polling that job 2 genuinely waited at `queued` while job 1 rendered (queue proof),
    confirmed both reached `done`, and validated both output files with `ffprobe` (correct duration,
    size, valid H.264/AAC MP4s).
- Decisions this session: see `memory/DECISIONS.md` — M7's "batch" interpretation (existing-project
  bulk-render, not literal JSON clip import), the render queue, and the Chromium-reuse bug/fix are
  the three new entries from this part of the session.
- Broke / known issues: none currently known. The Chromium-reuse fix should also make any *sequence*
  of renders in one session more reliable, not just batches — worth keeping in mind if a future
  session sees odd render failures after several renders in a row (check `ps aux | grep
  chrome-headless-shell` first).

## Next up (in priority order)

1. Real cloud rendering path (Lambda or a hosted self-run worker) once there's an AWS account and/or
   an actual deployment target — not blocking further local feature work.
2. M9 (URL ingestion, optional/off-by-default) and M10 (polish) remain unstarted.
3. Smaller open items noted along the way: no save/apply template library for Title Banner/Caption;
   Caption is per-clip not per-word; Title Banner/Caption editors use numeric position instead of a
   Konva drag canvas.
4. Eventually: hosted Supabase project + Vercel deploy. Note M5's local rendering + fire-and-forget
   Route Handler approach explicitly won't work unmodified on Vercel — flagged in DECISIONS.md.

## Open questions for the owner

- M5 now renders locally to disk rather than via AWS Lambda — confirm this is the right long-term
  direction, or whether cloud rendering should be revisited later (local-disk rendering won't work
  the same way on Vercel — would need a real separate worker process then).
- M7 "batch" was interpreted as bulk-rendering existing projects (see DECISIONS.md) — confirm that's
  what was wanted, versus e.g. bulk clip import via JSON referencing already-uploaded files.
- When ready to deploy for real: hosted Supabase project region/naming preference?
