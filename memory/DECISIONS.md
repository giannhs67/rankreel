# RankReel — Decisions log (append-only)

One line per non-obvious choice, with the reason. Newest at the bottom.

- **2026-07-31** — Project named **RankReel** (was "ShortsForge" in the original kickoff draft).
  Owner's choice when setting up the open-source repo; leans into the flagship Ranking List format.
- **2026-07-31** — License: **MIT**. Owner chose permissive over AGPL/GPL to minimize contribution
  friction; this is a self-hosted tool, not a service the maintainer runs, so the "SaaS clone"
  concern AGPL addresses was judged not to apply strongly enough to be worth the friction.
- **2026-07-31** — Project repo lives at `tool/rankreel/` as its own git repo, separate from the
  unrelated `watermark-remover` Python tool that shares the parent `tool/` directory on disk.
- **2026-07-31** — Scaffolded with **Next.js 16.2.12** (latest via `create-next-app`) rather than
  pinning to an older well-known version. Consequence: `middleware.ts` does not exist in this
  version — it's been renamed to `proxy.ts` (same behavior, see CLAUDE.md). Any future session
  should verify APIs against `node_modules/next/dist/docs/` rather than assuming pre-16 conventions.
- **2026-07-31** — Left `npm audit`'s 12 high-severity advisories unfixed rather than running
  `npm audit fix --force`. The forced fix would downgrade `next` to `9.3.3` because the vulnerable
  `postcss`/`sharp`/`minimatch` versions are bundled transitively inside `next@16.2.12` itself — the
  suggested fix is not a real fix. Revisit when upstream Next.js patches these in a 16.x release.
- **2026-07-31** — Storage RLS policies use `auth.uid() is not null` rather than a per-user path
  prefix. Justified because this is explicitly a single-owner app (ClaudePrompt.md §3) — there is
  only ever one authenticated user per deployment, so "authenticated" and "is the owner" are
  equivalent. Would need revisiting if multi-user support were ever added (it's explicitly out of
  scope per the guardrails).
- **2026-07-31** — `create-owner`/`reset-password` scripts are plain `.mjs` (not TypeScript) run via
  `node --env-file=.env.local`, instead of adding `tsx`/`ts-node` as a dependency. Node 24 (in use)
  supports `--env-file` natively; these scripts are simple enough that skipping a TS toolchain for
  them isn't a real loss, and it's one fewer dependency for contributors to reason about.
- **2026-07-31** — Disabling public signups in Supabase and creating the owner account are documented
  manual steps (README/CONTRIBUTING), not automated. There's no Supabase Management API call that's
  simpler than clicking the dashboard toggle, and scripting Supabase project-level auth config would
  need a personal access token with broader scope than the service-role key already in `.env.local`.
- **2026-07-31** — Development happens against a **local** Supabase instance (`supabase init` +
  `supabase start`, Docker), not a hosted project. Local dev keys in `.env.local` are Supabase's
  well-known local demo JWTs (identical on every machine running `supabase start` — not secrets, safe
  in a local-only `.env.local`). "Disable public signups" doesn't apply locally since the local stack
  isn't reachable from the public internet; that step is deferred until there's a hosted project.
- **2026-07-31** — Auth was verified with a throwaway Playwright script (chromium, headless) run
  outside the repo, rather than `curl`. Reason: the login form is a React Server Action, invoked via
  the browser's `Next-Action` protocol — a plain `curl -d` POST to `/login` just re-renders the page
  and silently does nothing. Any future manual/automated test of a Server-Action-backed form needs a
  real browser (Playwright etc.), not curl.
- **2026-07-31** — Clip files upload directly from the browser to Supabase Storage (via the browser
  Supabase client), not through a Server Action. A Server Action would have to receive the whole
  video file in the action's request body, which doesn't scale to real clip sizes; direct-to-Storage
  upload is the standard pattern and Storage RLS already restricts it to the authenticated owner.
  The DB row (`clips` insert) is a separate, small Server Action call after the upload succeeds.
- **2026-07-31** — Reordering swaps `order_index` between the moved clip and its neighbor rather than
  renumbering the whole list. Simpler, and gaps in `order_index` (e.g. after a delete) don't matter
  since ordering only ever does `ORDER BY order_index ASC` — no code anywhere assumes contiguous
  values.
- **2026-07-31** — Added `data-testid="clip-row"` / `data-clip-id` to the clip row `<li>` elements.
  Not for any app behavior — it's there because a naive Playwright test that located rows by visible
  text broke the moment a row flipped into edit mode (text moves from a `<p>` into an `<input>`'s
  `defaultValue`, which isn't part of `textContent`). A stable id-based hook is generally worth having
  for future tests too, not just this one.
- **2026-07-31** — Ranking List clip duration in the preview is a fixed 4-second placeholder unless
  a clip's `trim_start`/`trim_end` are both set (nothing sets them yet). Probing real video duration
  server-side (ffprobe) or client-side (`@remotion/media-utils`) was judged out of scope for "get the
  composition working" — real trimming is genuinely an M4 (editor) concern, not an M3 one, and a
  placeholder duration doesn't block verifying the composition/reveal logic itself.
- **2026-07-31** — The Ranking List composition and its live preview only needed `remotion` +
  `@remotion/player` (both lightweight, browser-only). Did **not** install `@remotion/renderer` /
  `@remotion/lambda` yet — those need headless Chrome + ffmpeg and are M5's concern (actual MP4
  export), not M3's (in-app preview only). Keeps this milestone's dependency footprint minimal.
- **2026-07-31** — Signed Storage URLs for preview use a 30-minute TTL, generated fresh on every
  page load of `/projects/[id]/preview` via the owner's own authenticated session (not the
  service-role key — RLS still applies). Long enough for a preview session, short enough that a
  leaked URL isn't a standing liability. No caching/reuse of signed URLs across requests — simplicity
  over a marginal API-call savings.
- **2026-07-31** — M4's text editor styles **one shared text block** for the whole ranking list
  (font/size/colors/stroke/position/animation apply uniformly to every row), not independent
  per-row or per-word/phrase styling. `ClaudePrompt.md` §1 says "color per word/phrase" — read
  literally that's richer than what's built. Scoped down because per-word styling would mean a much
  bigger data model (a layer per word, not one per template) for a payoff that doesn't show up until
  someone actually wants two differently-colored words in the same row. Revisit if that's requested;
  the `config_json` shape can grow into an array of styled layers without breaking what exists.
- **2026-07-31** — `templates` rows are created lazily, one per project, the first time its editor is
  opened (not upfront in M2, not shared across projects yet). This means M6 ("save current look as a
  template; apply template to a new project") still needs real work — right now every project
  quietly gets its own private template row via `projects.template_id`, there's no "template library"
  UI. The data model already supports reuse (any project could point its `template_id` at another
  project's template row); only the UI for browsing/applying one doesn't exist yet.
- **2026-07-31** — `useLoadFont` returns an incrementing counter, not a boolean "ready" flag. A
  boolean that's already `true` and gets set to `true` again is a no-op in React (bails out, doesn't
  re-render) — which would silently break the Konva canvas's redraw-on-font-load trigger the second
  time a font finishes loading (e.g. switching between two Google Fonts). A monotonically increasing
  value always differs, so the redraw effect always fires. Also sidesteps an
  `react-hooks/set-state-in-effect` lint error from resetting state synchronously at the top of the
  effect — the counter is only ever set from inside the async load's completion, which is the
  legitimate "respond to an external system" case the rule allows.
- **2026-07-31** — Custom font upload path stores the Storage **path** in `config_json`
  (`font.customFontPath`), never a signed URL. Signed URLs expire; a path doesn't. Every page that
  needs to actually render the font (editor, preview) mints a fresh signed URL server-side at load
  time from that stored path — same pattern already used for clip video URLs.
