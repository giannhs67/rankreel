# RankReel

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**RankReel** is a self-hosted, open-source tool for turning video clips into vertical "Shorts" —
ranking-list countdowns, title-banner clips, and word-by-word caption videos — with full control over
text, fonts, colors, placement, and animation, plus unattended **batch rendering**.

It's built to be *your* instance: you deploy it with your own Supabase project and a single owner
login. There's no managed service, no billing, and no multi-tenant hosting run by anyone else.

> Status: early / pre-alpha. See [ROADMAP.md](ROADMAP.md) once M0 lands, and
> [ClaudePrompt.md](ClaudePrompt.md) for the full product + technical spec this project is built from.

---

## Features (planned / in progress)

- **Ranking List** template — numbered countdown (#N → #1) that fills in as each clip plays, blurred
  backdrop, letterboxed video.
- **Title Banner** and **word-by-word Caption** templates.
- In-browser text editor: drag/place text, per-word/phrase color, stroke/outline, custom or Google
  Fonts, entrance animations (pop / slide / fade).
- Save a look as a **template** and reuse it across projects.
- **Batch rendering**: feed a list of {clip, title, number} jobs, render them all to MP4 unattended.
- Real auth (Supabase Auth), private storage, row-level security — your data stays yours.

## Tech stack

- **App:** Next.js (App Router) + TypeScript, deployed on Vercel.
- **Database / Auth / Storage:** Supabase (Postgres, Auth, Storage, Realtime).
- **Video rendering:** [Remotion](https://www.remotion.dev/), rendered off-Vercel via Remotion Lambda
  (or a self-hosted worker) — see [ClaudePrompt.md §2](ClaudePrompt.md#2-tech-stack-decided--dont-re-litigate-without-noting-why-in-memory).
- **Editor canvas:** Konva (`react-konva`).

Full rationale for these choices, the data model, and the milestone roadmap live in
[ClaudePrompt.md](ClaudePrompt.md) — it's the living spec for the project.

## Self-hosting / getting started

RankReel is designed to run as **your own deployment**, not a shared service:

1. Create your own [Supabase](https://supabase.com) project.
2. Fork/clone this repo and copy `.env.example` to `.env.local`, filling in your Supabase keys (and
   AWS credentials if using Remotion Lambda for rendering).
3. Run the Supabase SQL migrations in `/supabase/migrations` against your project.
4. Create your single owner account (`npm run create-owner`).
5. `npm install && npm run dev` to run locally, or deploy to Vercel with the same env vars set.

(Detailed step-by-step setup docs will land alongside the M0/M1 milestones — see
[ROADMAP.md](ROADMAP.md).)

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR — it
covers dev setup, branch/commit conventions, and the memory/roadmap files every change should keep in
sync. Community behavior is governed by the [Code of Conduct](CODE_OF_CONDUCT.md).

Found a security issue? Please **do not** open a public issue — see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) — do what you like with it, including running it commercially; just keep the license
notice. See [ClaudePrompt.md §8](ClaudePrompt.md#8-open-source--contribution-notes) for the
project's open-source ground rules (no telemetry, self-hosted only, etc).
