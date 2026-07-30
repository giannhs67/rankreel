## Current status

M0–M4 and M6 are done and verified against a real local Supabase instance (Docker, `supabase
start`). M5 (actual MP4 export via Remotion Lambda) is **skipped for now** — the owner doesn't have
an AWS account yet, and it's the one milestone so far that can't be built/verified without one. M6
was pulled forward since it only needed what M0–M4 already provide.

You can now: log in; create projects; upload/reorder/edit/delete clips; live-preview the Ranking
List composition; style it (position, font, colors, stroke, entrance animation) via the Konva editor;
**save that look as a named, reusable template; and apply a saved template to any other project**
(applies + persists immediately). Not yet built: actual MP4 export (M5, blocked on AWS), real
per-clip trimming (preview duration is still a 4s placeholder), batch (M7), the other two composition
formats (M8).

## Last session (2026-07-31, continued)

- Did (M6):
  - `app/projects/[id]/editor/actions.ts`: added `saveAsTemplate(projectId, name, config)` (inserts
    a new, independent `templates` row — doesn't touch the project's own template) and
    `applyTemplate(projectId, currentTemplateId, sourceTemplateId)` (reads the source template's
    `config_json`, resolves it against defaults, writes it into the *project's own* template row,
    and returns the resolved config so the client can update its editor state immediately without a
    full reload).
  - `editor/page.tsx`: now also fetches the owner's other saved templates (`format = 'ranking_list'`,
    excluding the current project's own template row) and passes that list down.
  - `template-editor.tsx`: added a "Templates" section — a name input + "Save as template" button,
    and (when any exist) a dropdown + "Apply" button for saved templates. Applying a template that
    uses a custom font re-signs a fresh Storage URL client-side for it (the returned config only has
    the font's *path*, same pattern as everywhere else custom fonts appear) so the font actually
    loads after applying, not just the config fields.
  - Verified with Playwright: styled a project distinctively (Oswald, magenta `#ff00ff`, 64px font,
    fade animation), saved it as a template named "Neon Countdown ...", created a second, plain
    project, applied that template to it, and confirmed — both in the editor's own UI state *and* via
    three separate direct Postgres queries (project A's template, the saved library template, project
    B's template after applying) — that all three hold byte-identical style config. Not a UI-only
    check. No console errors. All test data cleaned up afterward.
- Decisions: M5 explicitly skipped/deferred rather than attempted without AWS credentials; see
  `memory/DECISIONS.md` and the note now in `ROADMAP.md`'s M5 section.
- Broke / known issues: none currently known.

## Next up (in priority order)

1. M5 revisit, once an AWS account exists — or build the self-hosted-worker alternative
   (ClaudePrompt.md §2: a Railway/Render/Fly process polling the `jobs` table) if the owner would
   rather avoid AWS entirely. Ask which before starting.
2. Real per-clip trimming (`trim_start`/`trim_end` UI) — still a known gap, worth doing before M5
   actually renders anything, since export should use real durations.
3. M7 — Batch (paste/import a JSON array of {clip, title, number}, enqueue many jobs) and M8 (the
   other two composition formats) don't strictly need M5 to be *built*, but batch specifically implies
   rendering many jobs, so it's more naturally sequenced after M5. M8 (Title Banner / Caption
   compositions) could reasonably be built next instead if the owner wants to keep making visual
   progress without AWS.
4. Eventually: hosted Supabase project + Vercel deploy (still not blocking local dev work).

## Open questions for the owner

- Confirmed: no AWS account right now. When one exists (or if a non-AWS render worker is preferred
  instead), revisit M5.
- Given M5 is blocked, does the owner want M8 (more composition formats) or M7 (batch, though batch
  without real rendering is just "enqueue many jobs that never render") next? Recommend M8.
- When ready to deploy for real: hosted Supabase project region/naming preference?
