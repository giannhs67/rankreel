# RankReel — Roadmap

Milestones, in build order. Tick boxes as they land; see `memory/STATE.md` for the current session's
detailed status and `memory/DECISIONS.md` for why non-obvious calls were made.

**M0 — Skeleton & memory**
- [x] Next.js app, repo layout, `.gitignore`, `.env.example`.
- [x] Supabase migrations (tables + RLS), `clips`/`renders`/`fonts` bucket setup in SQL.
- [x] Create CLAUDE.md, ROADMAP.md, memory/STATE.md, memory/DECISIONS.md.
- [x] Local Supabase project running (`supabase start`, Docker), migration applied against it.
- [ ] Deploy the app to Vercel + a **hosted** (not local) Supabase project; wire env vars in Vercel.

**M1 — Auth (functional)**
- [x] Supabase Auth email+password, `create-owner` / `reset-password` scripts (service-role key).
- [x] `@supabase/ssr` session, `proxy.ts` guards (see CLAUDE.md — replaces `middleware.ts` in Next 16),
      /login, /logout.
- [x] Verified end-to-end with Playwright against the local Supabase instance: logged-out redirect,
      login, signed-in state, sign-out all pass with no console errors.
- [ ] Disable public signups on the **hosted** Supabase project once one exists (local dev instance
      doesn't need this — there's no public internet access to it).

**M2 — Upload & project**
- [x] Upload clips to Supabase Storage. Create project, list clips, reorder, set title+number.
- [x] Delete clip (removes both the DB row and the Storage object).
- [x] Verified end-to-end with Playwright + a real local Supabase instance: create project → upload
      2 real video files → reorder → edit title → delete (confirmed gone from both DB and Storage).

**M3 — Ranking template in Remotion**
- [x] `remotion/RankingList.tsx`: blurred backdrop of the current clip behind the ranking list,
      list reveals top-down as clips play (current entry highlighted), current clip letterboxed
      below. Props-driven (`clips: RankingClip[]`, ordered #N-first → #1-last to match playback).
- [x] Live preview in-app (`@remotion/player`) at `/projects/[id]/preview`, fed real signed Storage
      URLs for the owner's uploaded clips.
- [x] Verified end-to-end with Playwright: uploaded 3 real clips, opened preview, confirmed the
      Player actually renders `<video>` elements, clicked play, watched playback time advance, and
      confirmed the list grows from just "#5" to "#5 + #4" (current highlighted) as playback crosses
      the first clip boundary.

**M4 — Text editor (Konva)**
- [x] Drag-to-position ranking-list text block (Konva `<Stage>`, scaled-down WYSIWYG canvas), base +
      current-item color, stroke color/width, font size. Persisted to `templates.config_json`.
- [x] Custom font import (upload → `fonts` Storage bucket → FontFace API) + a curated Google Fonts
      picker (8 fonts, loaded dynamically via a Google Fonts stylesheet link).
- [x] Entrance animation per row: none / fade / slide / pop, real Remotion `interpolate`/`spring`
      driven off frames-since-revealed — configurable, applies to every row as each is revealed.
- [x] Verified end-to-end with Playwright: dragged the text block, changed font/size/colors/
      animation, uploaded a real custom `.ttf`, saved, then confirmed via a direct Postgres query
      that `config_json` persisted the exact dragged position and every style field, and confirmed
      in the preview DOM that the row actually renders with the custom font-family applied.
- [x] Per-clip trimming: real duration is now captured client-side on upload (hidden `<video>`
      element reads `.duration`), stored as `trim_start=0`/`trim_end=duration`; editable afterward
      via numeric inputs on the clip row. 4s is now only a fallback for pre-existing clips.
- [ ] Text styling is one shared block for the whole ranking list (not independently
      positionable/colorable per row or per word/phrase) — a deliberate scope cut, see DECISIONS.md.

**M5 — Render one MP4 (local, not Lambda)**
- [x] Owner has no AWS account, so this targets **local disk rendering** instead of Remotion Lambda —
      a variant of ClaudePrompt.md §2's self-hosted-worker fallback, simplified to run in-process
      since Vercel isn't in the picture yet either. `worker/render.ts` uses `@remotion/renderer` +
      `@remotion/bundler` to render any of the three compositions to a real MP4 on local disk
      (`renders/<projectId>/<jobId>.mp4`, gitignored).
- [x] `POST /api/render` creates a `jobs` row and renders asynchronously (fire-and-forget from the
      Route Handler — safe because this is a persistent local Node process, not a Vercel function);
      `GET /api/renders/[jobId]` streams the finished file back with proper auth + ownership checks.
- [x] Render progress/status shown in the UI via **polling** (2s interval), not Supabase Realtime —
      self-hosted local Realtime didn't reliably deliver `postgres_changes` events in this
      environment (verified broken even with the service-role key, no RLS involved). See
      DECISIONS.md.
- [x] Renders are serialized through an in-process queue (`renderQueue` in `app/api/render/route.ts`)
      so concurrent/batch renders don't contend for the same CPU/GPU — jobs sit at `queued` until
      their turn, confirmed via direct DB polling during a real 2-project batch render (M7).
- [x] Verified thoroughly: rendered a real ~22s clip end-to-end, confirmed via `ffprobe` that the
      output is a genuine playable H.264/AAC MP4 at 1080×1920/30fps matching the source clip's
      length, and visually confirmed via an extracted frame that the composition (blurred backdrop,
      ranking text, letterboxed clip, original audio) rendered correctly — not a blank/broken file.
      Also verified through the actual browser UI: click render → job appears → progress advances →
      download link works → downloaded file is valid.
- [ ] Real cloud rendering (Lambda or a separate hosted worker) is still open for whenever there's a
      deployment target and/or an AWS account — see the open question in STATE.md.

**M6 — Templates**
- [x] Save current look as a named, reusable template (`saveAsTemplate` — snapshots the editor's
      current config into a new `templates` row, independent of any project).
- [x] Apply a saved template to a project (`applyTemplate` — copies the chosen template's
      `config_json` into the project's own live template row; takes effect immediately, further
      tweaks still need their own explicit save).
- [x] Verified end-to-end with Playwright: styled project A distinctively (Oswald font, magenta,
      64px, fade), saved it as a named template, created a fresh project B, applied that template,
      and confirmed via direct Postgres queries that all three rows (A's own template, the saved
      library entry, and B's own template after applying) hold identical config — not just that the
      UI displayed the right values.
- [ ] Only Ranking List has the save/apply template UI — Title Banner and Caption don't yet.

**M7 — Batch**
- [x] Interpreted as: bulk-render multiple *existing* projects unattended with a progress dashboard
      (`/batch`) — the spec's literal "paste a JSON array of {clip, title, number}" doesn't map onto
      real video files, which need actual upload, not JSON references. See DECISIONS.md.
- [x] `/batch`: checkbox-select any projects that have clips, "Render N selected" enqueues a job per
      project (via the existing `/api/render`, no new render logic needed), all jobs shown in one
      dashboard (project name, status, progress, download) polling every 2s.
- [x] Verified with a real 2-project batch: confirmed via direct DB polling that job 2 genuinely sat
      at `queued` while job 1 was `rendering` (the M5 render queue actually serializes them), and
      both reached `done` with working downloads.

**M8 — Title-banner + Caption formats**
- [x] Projects now declare a `format` (`ranking_list` / `title_banner` / `caption`) at creation time
      (migration `0002_project_format.sql`); the editor, preview, and render routes all branch on it.
- [x] `remotion/TitleBanner.tsx`: full-bleed sequential clips with a single positioned banner line
      (the current clip's title), same font/color/stroke/animation system as Ranking List.
- [x] `remotion/Caption.tsx`: full-bleed sequential clips with a pill-style caption (background +
      text color) showing the current clip's title. **Not** true word-by-word sync — that needs
      per-word timestamps (ASR or a manual timing editor), neither of which exists yet. Real and
      renders actual captions, just at per-clip granularity. See DECISIONS.md.
- [x] `remotion/clip-timing.ts` and `remotion/entrance-style.ts` extracted as shared logic (clip
      sequencing math, entrance animations) so Ranking List, Title Banner, and Caption can't drift
      apart on identical behavior — Ranking List refactored to use them too (regression-tested).
- [x] Both new formats get a simpler editor (`simple-style-editor.tsx`: numeric X/Y instead of a
      Konva drag canvas, same font-upload/Google-Fonts pattern) — a deliberate scope cut vs. Ranking
      List's fuller M4 editor. No save/apply template library for these two formats yet either.
- [x] Verified end-to-end with Playwright for both new formats (create → upload → style → save →
      preview shows real `<video>` + the styled text during actual playback) *and* a full
      ranking_list regression pass afterward to confirm the shared-code refactor didn't break the
      original, already-verified format.

**M9 — URL ingestion (optional, isolated)**
- [ ] yt-dlp in the render worker: paste URL → download to `clips` bucket → becomes a clip.
      Off by default; ToS/legal caveat in README.

**M10 — Polish**
- [ ] Word-by-word caption sync, presets, keyboard shortcuts, export presets (Shorts/TikTok/Reels).
