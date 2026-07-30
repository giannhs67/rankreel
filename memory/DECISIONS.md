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
