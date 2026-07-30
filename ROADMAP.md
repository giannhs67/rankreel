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
- [ ] Per-clip duration is currently a fixed 4s placeholder unless `trim_start`/`trim_end` are set
      (nothing sets them yet — that's real trimming UI, deferred to M4's editor work).

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
- [ ] Per-clip trimming (`trim_start`/`trim_end`) — still not wired to any UI; preview duration stays
      a 4s placeholder. Explicitly deferred (not part of this pass — see DECISIONS.md).
- [ ] Text styling is one shared block for the whole ranking list (not independently
      positionable/colorable per row or per word/phrase) — a deliberate scope cut, see DECISIONS.md.

**M5 — Render one MP4 (Remotion Lambda)**
- [ ] `deploy-lambda`; app enqueues job → Lambda renders → MP4 to `renders` bucket; jobs row updated.
- [ ] Live progress via Supabase Realtime on `jobs`.
- Skipped for now — needs an AWS account (owner doesn't have one currently). Revisit once available;
  the self-hosted-worker alternative from ClaudePrompt.md §2 is the fallback if AWS stays off the
  table. Jumped ahead to M6 in the meantime since it only needed what M0–M4 already built.

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

**M7 — Batch**
- [ ] Paste/import a JSON array of {clip, title, number}; enqueue many jobs; progress dashboard.

**M8 — Title-banner + Caption formats**
- [ ] Two more Remotion compositions reusing the text/animation system.

**M9 — URL ingestion (optional, isolated)**
- [ ] yt-dlp in the render worker: paste URL → download to `clips` bucket → becomes a clip.
      Off by default; ToS/legal caveat in README.

**M10 — Polish**
- [ ] Word-by-word caption sync, presets, keyboard shortcuts, export presets (Shorts/TikTok/Reels).
