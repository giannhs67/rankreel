## Current status

M0–M4, M6, and now M5 (local variant) and M8 are done and verified against a real local Supabase
instance (Docker, `supabase start`). RankReel can now go from "upload a clip" all the way to "download
a real MP4" for all three composition formats:

- **Ranking List** (M3/M4/M6): blurred backdrop, progressive numbered list, letterboxed clip, Konva
  drag-to-position editor, templates you can save and reuse across projects.
- **Title Banner** (M8): full-bleed clip with a single positioned title line.
- **Caption** (M8): full-bleed clip with a pill-style caption. Per-clip granularity, not true
  word-by-word — see DECISIONS.md.

Every project now declares its `format` at creation time. Rendering (M5) happens **locally** (no AWS
— the owner doesn't have an account), via `@remotion/renderer` in-process, writing real MP4s to
`renders/` on disk. Verified with `ffprobe` and an extracted frame that output is genuinely correct,
not just "didn't crash."

Not yet built: real cloud/Lambda rendering (open until there's an AWS account or a deploy target),
M7 batch rendering, M9 URL ingestion, M10 polish. Per-clip trimming now captures real duration on
upload (no more universal 4s placeholder) and is editable via numeric inputs.

## Last session (2026-07-31, continued — long session, M5 local + M8)

- Did (M5, local render):
  - Installed `@remotion/renderer` + `@remotion/bundler`. Had to add
    `serverExternalPackages: ["@remotion/renderer", "@remotion/bundler"]` to `next.config.ts` —
    Turbopack otherwise tries to statically bundle their platform-specific native compositor
    binaries and fails (tries to resolve every OS/arch package, most not installed).
  - `worker/render.ts`: bundles the Remotion project once per server process (cached), then
    `renderCompositionLocally({compositionId, projectId, jobId, inputProps})` renders any of the
    three compositions to `renders/<projectId>/<jobId>.mp4`.
  - `POST /api/render`: creates a `jobs` row, kicks off rendering **without awaiting** (safe because
    this Next server is a persistent local Node process, not Vercel), returns the job id immediately.
  - `GET /api/renders/[jobId]`: auth + ownership + status checks, then streams the file from disk.
  - Real clip duration capture: `clip-upload-form.tsx` reads a hidden `<video>` element's
    `.duration` before upload, `addClip` stores `trim_start=0`/`trim_end=duration`. `ClipRow`'s edit
    form now has numeric trim_start/trim_end inputs. This mostly retires the old 4s placeholder.
  - `lib/ranking-render-data.ts` refactored to share `getSignedClipsForProject` /
    `getCustomFontSignedUrl` (new `lib/clip-signing.ts`) — behavior-identical, verified by the same
    render/preview tests passing before and after.
  - **Found and fixed a real infra issue**: Supabase Realtime (`postgres_changes`) does not reliably
    deliver events in this local self-hosted setup — verified broken even subscribing with the
    service-role key (no RLS/auth involved) during an actively-updating job. Rather than debug
    Elixir/Docker internals, switched the render-progress UI to 2-second polling. Simple, reliable,
    appropriate for a single-owner tool. `jobs` stays in the Realtime publication for whenever this
    gets revisited, but nothing currently depends on it working.
  - Verified thoroughly: rendered a real ~22s clip, confirmed via `ffprobe` the output is genuine
    H.264/AAC MP4 at 1080×1920/30fps with correct duration, and visually via an extracted frame that
    the composition rendered correctly (blurred backdrop, ranking text, letterboxed clip, original
    audio preserved). Also drove it through the actual browser UI end-to-end (click render → job
    appears → progress advances → download → valid file).
- Did (M8, two new formats):
  - Added `projects.format` column (migration `0002_project_format.sql`, default `'ranking_list'`,
    same check constraint values as `templates.format`). Project creation form now has a format
    picker.
  - Extracted `remotion/clip-timing.ts` (clip sequencing/current-index math) and
    `remotion/entrance-style.ts` (the fade/slide/pop animation logic) out of `RankingList.tsx` — pure,
    behavior-preserving refactor, reused by the two new compositions. Regression-tested afterward.
  - `remotion/TitleBanner.tsx` + `title-banner-config.ts`, `remotion/Caption.tsx` +
    `caption-config.ts`: new compositions, each with their own config shape/defaults/resolver
    (font/text/position/animation — similar shape to Ranking List's but not code-shared beyond the
    animation/timing helpers, to avoid risking the already-verified Ranking List config).
  - `lib/title-banner-render-data.ts`, `lib/caption-render-data.ts`: same pattern as
    `ranking-render-data.ts`, built on the shared `clip-signing.ts` helpers.
  - Editor and preview pages now branch on `project.format`. Ranking List's branch is untouched
    logic (same components, same behavior) — new formats get `simple-style-editor.tsx` (numeric X/Y
    instead of a Konva canvas — scope cut, see DECISIONS.md) and dedicated
    `title-banner-preview-player.tsx` / `caption-preview-player.tsx`.
  - Hit and fixed a real RSC bug: an early version of the preview page imported the Remotion
    composition components directly into the Server Component and passed them as a `component` prop
    to a client wrapper — this breaks (`React.createContext is undefined`) because component
    references and hook-using modules can't cross the Server→Client boundary as props like that. Fix:
    each format gets its own dedicated "use client" player file that imports its own composition
    internally, mirroring the pattern `ranking-preview-player.tsx` already used successfully — the
    server page only ever passes plain serializable data.
  - `updateTemplateConfig`'s type widened to accept any of the three config shapes (DB column is
    just `jsonb`; the action doesn't care) so `SimpleStyleEditor` could reuse it.
  - Verified with Playwright: full create → upload → style → save → preview cycle for both new
    formats, confirming the styled text (custom color) actually shows during real playback, **plus**
    a full ranking_list regression pass to confirm the shared-code refactor (clip-timing,
    entrance-style, RankingList.tsx changes) didn't break the original, already-verified format.
- Decisions: see `memory/DECISIONS.md` (several new entries this session — local rendering choice,
  polling over Realtime, RSC component-as-prop gotcha, scope cuts on the new formats' editors).
- Broke / known issues: none currently known to be broken. Known gaps: no save/apply template
  library for title_banner/caption yet; Caption is per-clip not per-word; no cloud rendering path.

## Next up (in priority order)

1. M7 — Batch: render multiple projects/jobs unattended with a progress dashboard. The exact
   "paste a JSON array" framing in ClaudePrompt.md doesn't map cleanly onto real video files (they
   need actual upload, not JSON) — likely interpretation is bulk-selecting existing projects to
   render together. Confirm scope before building if picked up.
2. Real cloud rendering path (Lambda or a hosted self-run worker) once there's an AWS account and/or
   an actual deployment target — not blocking further local feature work.
3. M9 (URL ingestion, optional/off-by-default) and M10 (polish) remain unstarted.
4. Eventually: hosted Supabase project + Vercel deploy.

## Open questions for the owner

- M5 now renders locally to disk rather than via AWS Lambda — confirm this is the right long-term
  direction, or whether cloud rendering should be revisited later (e.g. once deploying for real,
  local-disk rendering won't work the same way on Vercel — would need a real worker process then).
- Is the M7 "batch" interpretation above (bulk-render existing projects) right, or did you have
  something else in mind (e.g. bulk clip import via JSON referencing already-uploaded files)?
- When ready to deploy for real: hosted Supabase project region/naming preference?
