# Contributing to RankReel

Thanks for considering contributing! RankReel is a self-hosted, open-source tool, so contributions
are especially valuable — you're not just fixing a bug for one deployment, you're fixing it for
everyone who self-hosts.

## Before you start

- Read [ClaudePrompt.md](ClaudePrompt.md) — it's the living product/technical spec (stack decisions,
  data model, guardrails, roadmap). Please don't propose changes that contradict it (e.g. adding
  billing, or running heavy renders on Vercel functions) without opening an issue to discuss first.
- Check [ROADMAP.md](ROADMAP.md) and open issues/PRs so you don't duplicate work in flight.
- For anything non-trivial (new feature, architectural change), **open an issue before writing code**
  so we can agree on the approach.

## Dev setup

1. Fork the repo and clone your fork.
2. Create your own [Supabase](https://supabase.com) project (free tier is fine for development).
3. Copy `.env.example` to `.env.local` and fill in your Supabase project's keys.
4. Run the SQL migrations in `/supabase/migrations` against your project.
5. `npm install`
6. `npm run create-owner` to create your local owner account.
7. `npm run dev` and open `http://localhost:3000`.

Never commit `.env.local`, real Supabase/AWS credentials, or media containing identifiable people.

## Memory & roadmap files

This project uses a lightweight memory system (see [ClaudePrompt.md §5](ClaudePrompt.md#5--memory--roadmap-system-build-this-first-before-features))
so anyone — human or AI-assisted — can pick up work with full context:

- `CLAUDE.md` — always-loaded conventions and guardrails. Read it first.
- `ROADMAP.md` — the milestone checklist. Tick boxes as you land them.
- `memory/STATE.md` — what currently works, what's next, open questions.
- `memory/DECISIONS.md` — append-only log of non-obvious choices and why.

If your PR changes behavior, meaningfully update `memory/STATE.md` and, if you made a non-obvious
call, add a line to `memory/DECISIONS.md`. This keeps the project reviewable without needing to
reconstruct context from commit archaeology.

## Branches, commits, and PRs

- Branch from `main`: `feat/<short-description>`, `fix/<short-description>`, `docs/<short-description>`.
- Keep PRs scoped to one milestone/issue where possible — small, reviewable PRs merge faster.
- Write commit messages that explain *why*, not just *what*.
- Reference the milestone or issue number in your PR description.
- Make sure the app actually runs and, if you touched rendering, that a real MP4 comes out the other
  end — no mocked/stubbed features (see the guardrails in `ClaudePrompt.md`).
- One approving review is required before merge.

## Code style

- TypeScript, Next.js App Router conventions.
- Run the linter/formatter before pushing (`npm run lint`) once these are set up in the repo (M0).
- Prefer small, well-named functions/components over speculative abstractions.

## Reporting bugs / requesting features

Use the GitHub issue templates under `.github/ISSUE_TEMPLATE/`. For security vulnerabilities, **do
not** open a public issue — see [SECURITY.md](SECURITY.md).

## Code of Conduct

By participating, you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md).
