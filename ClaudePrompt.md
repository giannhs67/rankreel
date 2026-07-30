# RankReel — Build Kickoff Prompt

> Paste this whole file as the first message to Claude Code (or open it in your repo as `ClaudePrompt.md`).
> It defines the product, the stack, and — importantly — the **memory + roadmap system** so every
> new Claude session picks up exactly where the last one stopped.

---

## 0. Role & prime directive

You are the lead engineer building **RankReel**, a browser-based, self-hostable tool that turns video
clips into "viral" vertical Shorts (ranking-list, title-banner, and caption formats) with custom text,
numbering, fonts, colors, animation, and **batch processing**.

**This is a self-hosted personal tool, released as open source. No SaaS, no subscriptions, no
built-in billing, no multi-tenant hosting run by the maintainer.** Each user deploys their own
instance with their own Supabase project and a single owner account. Hosted online on **Vercel**,
with **Supabase** as the database, auth, and file storage.

Before writing any code in **every session**, you MUST:
1. Read `CLAUDE.md`, `ROADMAP.md`, and `memory/STATE.md` (see §5).
2. Summarise in 3 lines what's done and what's next.
3. Update those files as you work and again before you end the session.

---

## 1. What it does (from the product owner)

- Input clips by **file upload** (v1) and later by **URL** (yt-dlp render worker, v3).
- Pick a **template** (Ranking List, Title Banner, Word-by-word Caption).
- For the Ranking format: add N clips; each gets a **custom title/name** and an auto **number** in
  sequence (#5 → #1). The on-screen list **fills in** as each clip plays. Blurred copy of the clip
  fills the empty top bar; clip is letterboxed below.
- **Text controls:** import/choose fonts, change color per word/phrase, move & place text freely,
  outline/stroke, basic entrance animation (pop/slide/fade).
- **Templates:** save a look (fonts, colors, positions, animation) and reuse it.
- **Batch:** feed a list of jobs (clip + title + number) and render them all to MP4 unattended.
- **Auth:** a real login gate (owner only) via Supabase Auth.

---

## 2. Tech stack (decided — don't re-litigate without noting why in memory)

- **App/host:** **Next.js (App Router) + TypeScript**, deployed on **Vercel**.
- **Database:** **Supabase Postgres** (accessed via `@supabase/supabase-js` + Row Level Security).
- **Auth:** **Supabase Auth** (email+password). Single owner — lock signups (see §3).
- **File storage:** **Supabase Storage** buckets — `clips` (uploads) and `renders` (output MP4s).
- **Video composition/render:** **Remotion** (design the template once as a React component, feed
  props, render real MP4; supports batch rendering from a data array).
- **In-browser canvas editor (drag/move/place text):** **Konva** (`react-konva`).
- **Fonts:** `FontFace` API + Google Fonts; allow user `.ttf/.otf/.woff2` upload to Supabase Storage.
- **Fast in-browser export path (optional v2):** WebCodecs `VideoEncoder` + `mp4-muxer`.

### ⚠️ Rendering does NOT run on Vercel serverless
Remotion/ffmpeg renders are long and heavy — Vercel functions time out. Use **one** of:
- **Remotion Lambda** (AWS) — the recommended production path for batch. Vercel app enqueues a job;
  Lambda renders; output lands in Supabase Storage (or S3, then copied). **Pick this.**
- A separate always-on **render worker** (Railway/Render/Fly) polling the Supabase `jobs` table — use
  only if you'd rather avoid AWS.

The Next.js app on Vercel is the editor + API + queue writer; the heavy render happens off-Vercel.

Repo layout: `/app` (Next.js), `/remotion` (compositions), `/worker` (Lambda or poller),
`/shared` (types), `/supabase` (SQL migrations + RLS policies).

---

## 3. Login system (spec — must be functional, not stubbed)

- Use **Supabase Auth** email+password.
- **Single owner:** disable public signups in Supabase Auth settings; create the owner account once
  (via Supabase dashboard or a one-time `npm run create-owner` script using the service-role key).
- Middleware (`middleware.ts`) guards all app routes and API routes except `/login`.
- `/login` → Supabase sign-in → session cookie (via `@supabase/ssr`). `/logout` clears it.
- No signup page, no reset email needed (personal) — reset from the Supabase dashboard, or a
  `npm run reset-password` CLI using the service-role key.
- RLS: every table scoped to `auth.uid() = owner_id` so data is private even if the anon key leaks.
- Every self-hosted instance is independent: contributors and users run this against their **own**
  Supabase project and never share credentials or data with anyone else's deployment.

---

## 4. Data model (Supabase Postgres + RLS)

```
-- auth.users is managed by Supabase Auth (the owner lives here)
templates(id uuid pk, owner_id uuid, name, format, config_json jsonb, created_at)
projects(id uuid pk, owner_id uuid, name, template_id, created_at, updated_at)
clips(id uuid pk, project_id uuid, owner_id uuid, order_index int, storage_path,
      title, number int, trim_start, trim_end)
jobs(id uuid pk, project_id uuid, owner_id uuid, status, progress, output_path, error,
     created_at, updated_at)
```
- `status` in ('queued','rendering','done','error'). Enable **Realtime** on `jobs` for live progress.
- RLS policy on every table: `owner_id = auth.uid()`.
- Storage buckets `clips`, `renders`, `fonts` — private, owner-only policies.
- Keep SQL as migrations in `/supabase/migrations`; commit them.

---

## 5. 🧠 Memory & roadmap system (build this FIRST, before features)

This is what keeps sessions in sync — for the maintainer *and* for contributors picking up an issue.
Create these files at repo root on day one and **keep them current**.

### `CLAUDE.md` (conventions + always-loaded context)
```
# RankReel — project memory
- Product: self-hosted, open-source browser tool. No SaaS/billing. One owner account per deployment.
- Host: Vercel (Next.js App Router + TS). DB/Auth/Storage: Supabase.
- Render: Remotion via Remotion Lambda (heavy render is OFF Vercel). Konva for the text editor.
- Repo: /app /remotion /worker /shared /supabase.
- Secrets in .env.local (never commit): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY, plus AWS creds for Remotion Lambda.
- Rule: read ROADMAP.md + memory/STATE.md before coding; update them before ending a session.
- Rule: never introduce a paid SaaS/billing feature. Never run heavy renders on Vercel functions.
- Rule: every table has RLS owner_id = auth.uid().
- Rule: no telemetry / phone-home analytics — this runs on other people's infrastructure.
- Commands: `npm run dev`, `npm run deploy-lambda`, `npm run create-owner`, `npm run reset-password`.
```

### `ROADMAP.md` (the plan, checkboxes)
Milestones in §6 below — paste them here as a checklist and tick as you go.

### `memory/STATE.md` (living session log — the sync file)
```
## Current status
<1 paragraph: what works end-to-end right now>

## Last session (YYYY-MM-DD)
- Did: ...
- Decisions: ... (and WHY)
- Broke / known issues: ...

## Next up (in priority order)
1. ...

## Open questions for the owner
- ...
```

### `memory/DECISIONS.md` (append-only)
One line per non-obvious choice, with the reason, so future sessions (and future contributors)
don't undo them.

**Session protocol (also put in CLAUDE.md):**
> Start: read CLAUDE.md, ROADMAP.md, memory/STATE.md → state done/next in 3 lines.
> End: update STATE.md, tick ROADMAP.md, append any DECISIONS.md, commit referencing the milestone.

This same protocol applies to human contributors, not just Claude sessions — see `CONTRIBUTING.md`.

---

## 6. Roadmap / milestones (build in this order)

**M0 — Skeleton & memory**
- [ ] Next.js app, repo layout, `.gitignore`, `.env.example`.
- [ ] Supabase project: create tables + RLS migrations, `clips`/`renders`/`fonts` buckets.
- [ ] Create CLAUDE.md, ROADMAP.md, memory/STATE.md, memory/DECISIONS.md.
- [ ] Deploy the empty app to Vercel; wire Supabase env vars in Vercel.

**M1 — Auth (functional)**
- [ ] Supabase Auth email+password, signups disabled, `create-owner` script.
- [ ] `@supabase/ssr` session, `middleware.ts` guards, /login, /logout. reset-password CLI.

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

---

## 7. Guardrails
- Never add billing, subscriptions, analytics, or extra cloud SaaS.
- Never run heavy Remotion/ffmpeg renders inside Vercel functions — always Lambda/worker.
- Every table has RLS `owner_id = auth.uid()`. Service-role key only server-side, never shipped to client.
- Keep URL-download behind an explicit toggle; ToS caveat in the README.
- Everything must actually run and export a real MP4 — no mocked features.
- Commit after each milestone. Update memory files every session.
- No telemetry, tracking, or phone-home calls of any kind — instances run on contributors' own infra.
- Never commit real Supabase/AWS credentials, sample media with identifiable people, or `.env*` files.

---

## 8. Open source & contribution notes
- License: MIT (see `LICENSE`). Contributions are accepted under the same license.
- This is a **self-hosted** project, not a managed service — issues/PRs should assume the reader is
  running their own Supabase project and Vercel deployment, not asking the maintainer to host for them.
- See `CONTRIBUTING.md` for the dev setup, branch/PR conventions, and how the memory/roadmap files
  above apply to human contributors.
- See `CODE_OF_CONDUCT.md` for community expectations and `SECURITY.md` for how to privately report
  vulnerabilities (this tool handles auth and service-role keys — don't file security issues publicly).

---

## 9. First message to send after this
> "Read this ClaudePrompt.md. Start with M0 and M1. Scaffold the Next.js app + repo layout, create the
> Supabase migrations (tables + RLS) and storage buckets, set up the memory files (CLAUDE.md,
> ROADMAP.md, memory/STATE.md, memory/DECISIONS.md), wire Supabase Auth with signups disabled and a
> create-owner script, add middleware route guards and /login + /logout, and deploy the skeleton to
> Vercel. Then stop and show me how to run it locally and the deployed URL."
