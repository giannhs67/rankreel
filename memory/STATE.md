## Current status

M0–M4 are done and verified against a real local Supabase instance (Docker, `supabase start`). You
can: log in, create a project, upload real video files, reorder/edit/delete clips, preview the actual
Ranking List composition live, and now **style it** — drag the text block to reposition it, change
font (curated Google Fonts or a custom uploaded `.ttf`/`.otf`/`.woff2`), size, base/current-item
colors, stroke, and entrance animation (none/fade/slide/pop) — all persisted per-project (via a
`templates` row) and reflected immediately in the live preview.

Not yet built: real MP4 export (M5), reusable/shareable templates across projects (M6 — the data
model already supports it, just no "apply this template to a new project" UI yet), batch (M7), the
other two composition formats (M8). Per-clip duration in the preview is still a fixed 4s placeholder
— no trimming UI exists yet.

## Last session (2026-07-31, continued)

- Did (M4):
  - `remotion/ranking-config.ts`: `RankingListConfig` type (font/text/position/animation),
    `DEFAULT_RANKING_CONFIG`, `resolveRankingConfig()` (merges partial/legacy DB JSON with defaults
    so old/empty config_json never crashes rendering), `CURATED_GOOGLE_FONTS` (8 fonts).
  - `lib/use-load-font.ts`: loads a Google Fonts stylesheet or a custom FontFace from a signed
    Storage URL, returns a version counter (not a boolean — see DECISIONS.md) so canvas renderers
    know when to redraw.
  - `remotion/RankingList.tsx`: now takes a `config` prop and actually uses it — font family, sizes,
    colors, stroke, and a real per-row entrance animation (`entranceStyle()` using
    `interpolate`/`spring` off frames-since-that-row-was-revealed). Position is a draggable offset
    applied to the whole list block.
  - `/projects/[id]/editor`: new route. Server Component gets-or-creates a `templates` row for the
    project (format `ranking_list`, linked via `projects.template_id`, created lazily on first visit
    — Server Components can safely do this kind of write, it's not restricted like `cookies().set()`
    is), resolves config + a signed custom-font URL if needed, hands off to `<TemplateEditor>`.
  - `template-editor.tsx` (client) + `konva-canvas.tsx` (client, dynamically imported with
    `ssr: false` since Konva touches `window` at import time): a scaled-down (360×640, 1/3 scale)
    live WYSIWYG canvas showing two sample rows, draggable to set position; plain HTML controls for
    font/size/colors/stroke/animation; a file input wired to upload straight to the `fonts` Storage
    bucket then load it via `FontFace`; one explicit "Save changes" button persisting the whole
    config via a Server Action (`updateTemplateConfig`).
  - `/projects/[id]/preview` now loads the project's template config + resolves a fresh signed
    custom-font URL, passes both into the Player, which also runs `useLoadFont` so the font is
    actually loaded before/while it renders (DOM text re-renders on its own once a web font loads —
    only the Konva canvas needed an explicit redraw trigger).
  - Fixed an ESLint `react-hooks/set-state-in-effect` violation in the font hook by switching from a
    boolean `setReady(false)` reset to an always-incrementing counter, never set synchronously at the
    top of the effect.
  - Verified thoroughly with Playwright: uploaded a clip, opened the editor, confirmed a real
    `<canvas>` renders, changed font size/colors/animation via the controls, dragged the Konva group
    (had to slow the synthetic mouse-move down — a single big jump doesn't register as a Konva drag,
    it needs paced intermediate `mousemove` events), uploaded a real system font file
    (`Academy Engraved LET Fonts.ttf`) end-to-end through Storage, saved, and — critically — queried
    Postgres directly afterward and confirmed `config_json` held the *exact* dragged position
    (delta matched the mouse movement to the pixel) and every style field. Also confirmed in the
    preview page's DOM that the rendered row's `font-family` actually contains the custom font name.
    No console errors. All test data (project, clip, font file) cleaned up afterward.
- Decisions: see `memory/DECISIONS.md`.
- Broke / known issues: none currently known.

## Next up (in priority order)

1. M5 — Render one MP4 via Remotion Lambda: `deploy-lambda` script, app enqueues a `jobs` row, Lambda
   renders using the same `RankingList` composition + resolved config, output lands in the `renders`
   bucket, Realtime progress on `jobs`. Needs AWS credentials — ask the owner before wiring these up.
2. Real per-clip trimming would make the preview's duration less of a placeholder — worth doing
   before or alongside M5 rather than after, since export should use real durations too.
3. Eventually: hosted Supabase project + Vercel deploy (still not blocking local dev work).

## Open questions for the owner

- Remotion Lambda (AWS) vs. a self-hosted render worker (Railway/Render/Fly) for M5 — spec recommends
  Lambda; need AWS credentials in `.env.local` before that work can start for real.
- When you're ready to deploy for real: hosted Supabase project region/naming preference?
