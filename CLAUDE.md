# RankReel — project memory

- Product: self-hosted, open-source browser tool. No SaaS/billing. One owner account per deployment.
- Host: Vercel (Next.js App Router + TS). DB/Auth/Storage: Supabase.
- Render: Remotion via Remotion Lambda (heavy render is OFF Vercel). Konva for the text editor.
- Repo: `/app` `/remotion` `/worker` `/shared` `/supabase` `/scripts` `/memory`.
- Secrets in `.env.local` (never commit): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, plus AWS creds for Remotion Lambda. See `.env.example`.
- Rule: read `ROADMAP.md` + `memory/STATE.md` before coding; update them before ending a session.
- Rule: never introduce a paid SaaS/billing feature. Never run heavy renders on Vercel functions.
- Rule: every table has RLS `owner_id = auth.uid()`.
- Rule: no telemetry / phone-home analytics — this runs on other people's infrastructure.
- Commands: `npm run dev`, `npm run deploy-lambda`, `npm run create-owner`, `npm run reset-password`.

## Stack version notes (don't assume older APIs — this stack moves fast)

- **Next.js 16.2.12** (App Router), React 19.2, Tailwind v4. Scaffolded via `create-next-app` on
  2026-07-31 — this is newer than typical training data; check
  `node_modules/next/dist/docs/` before using an API you're not sure about.
- **`middleware.ts` is gone — it's `proxy.ts` now.** Same behavior (runs on every matched request,
  `export const config = { matcher: [...] }`), but the file must be named `proxy.ts` at the repo root
  and export a function named `proxy` (default or named export). Auth route guards (M1) go here.
- `cookies()` / `headers()` from `next/headers` are **async** — always `await cookies()`.
- Package manager: npm (not pnpm/yarn) — `package-lock.json` is committed.

## Guardrails specific to this repo

- Full guardrail list lives in `ClaudePrompt.md` §7 — read it, don't duplicate/fork it here.
- Known accepted risk: `npm audit` reports 12 high-severity advisories in `eslint*`/`postcss`/`sharp`,
  all nested inside `next@16.2.12`'s own dependency tree. `npm audit fix --force` wants to downgrade
  to `next@9.3.3`, which is not a fix. Leave as-is; revisit when Next.js ships a patched 16.x release
  (see `memory/DECISIONS.md`).
