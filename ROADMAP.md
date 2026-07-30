# RankReel — Roadmap

Milestones, in build order. Tick boxes as they land; see `memory/STATE.md` for the current session's
detailed status and `memory/DECISIONS.md` for why non-obvious calls were made.

**M0 — Skeleton & memory**
- [x] Next.js app, repo layout, `.gitignore`, `.env.example`.
- [x] Supabase migrations (tables + RLS), `clips`/`renders`/`fonts` bucket setup in SQL.
- [x] Create CLAUDE.md, ROADMAP.md, memory/STATE.md, memory/DECISIONS.md.
- [ ] Create the actual Supabase project and run the migration against it.
- [ ] Deploy the empty app to Vercel; wire Supabase env vars in Vercel.

**M1 — Auth (functional)**
- [ ] Supabase Auth email+password, signups disabled, `create-owner` script.
- [ ] `@supabase/ssr` session, `proxy.ts` guards (see CLAUDE.md — replaces `middleware.ts` in Next 16),
      /login, /logout. reset-password CLI.

**M2 — Upload & project**
- [ ] Upload clips to Supabase Storage. Create project, list clips, reorder, set title+number.

**M3 — Ranking template in Remotion**
- [ ] Port the HTML ranking layout to a Remotion `<Composition>`: blurred top, multi-color title,
      1..N list that reveals per clip, letterboxed clip. Props-driven from project data.
- [ ] Live preview in-app (Remotion Player).

**M4 — Text editor (Konva)**
- [ ] Move/place text layers, color per phrase, stroke/outline, font size. Persist to config_json.
- [ ] Import custom font (upload → Storage → FontFace) + Google Fonts picker.
- [ ] Entrance animation per layer: pop / slide / fade (maps to Remotion interpolate).

**M5 — Render one MP4 (Remotion Lambda)**
- [ ] `deploy-lambda`; app enqueues job → Lambda renders → MP4 to `renders` bucket; jobs row updated.
- [ ] Live progress via Supabase Realtime on `jobs`.

**M6 — Templates**
- [ ] Save current look as a template; apply template to a new project.

**M7 — Batch**
- [ ] Paste/import a JSON array of {clip, title, number}; enqueue many jobs; progress dashboard.

**M8 — Title-banner + Caption formats**
- [ ] Two more Remotion compositions reusing the text/animation system.

**M9 — URL ingestion (optional, isolated)**
- [ ] yt-dlp in the render worker: paste URL → download to `clips` bucket → becomes a clip.
      Off by default; ToS/legal caveat in README.

**M10 — Polish**
- [ ] Word-by-word caption sync, presets, keyboard shortcuts, export presets (Shorts/TikTok/Reels).
