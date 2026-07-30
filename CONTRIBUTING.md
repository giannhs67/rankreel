# Contributing to RankReel

Thanks for considering contributing! RankReel is a self-hosted, open-source tool, so contributions
are especially valuable — you're not just fixing a bug for one deployment, you're fixing it for
everyone who self-hosts.

## Before you start

- Check [open issues](https://github.com/amjadiqbal/rankreel/issues) and
  [pull requests](https://github.com/amjadiqbal/rankreel/pulls) so you don't duplicate work in flight.
- For anything non-trivial (new feature, architectural change), **open an issue before writing code**
  so we can agree on the approach.
- Read the [Guardrails](#guardrails) below — a PR that contradicts them (adds billing, telemetry,
  etc.) will be asked to change direction before review.

## Dev setup

1. Fork the repo and clone your fork.
2. Create your own [Supabase](https://supabase.com) project (free tier is fine for development), or
   run one locally with the [Supabase CLI](https://supabase.com/docs/guides/local-development)
   (`supabase init && supabase start`).
3. Copy `.env.example` to `.env.local` and fill in your Supabase project's keys.
4. Run the SQL migrations in `/supabase/migrations` against your project, in order.
5. `npm install`
6. `npm run create-owner -- you@example.com "a strong password"` to create your local owner account,
   then disable public signups in Supabase Dashboard → Authentication → Sign In / Providers → Email.
7. `npm run dev` and open `http://localhost:3000`.

Never commit `.env.local`, real Supabase/AWS credentials, or media containing identifiable people.

## Branches, commits, and PRs

- Branch from `main`: `feat/<short-description>`, `fix/<short-description>`, `docs/<short-description>`.
- Write commit messages using [Conventional Commits](https://www.conventionalcommits.org/) style where
  practical (`feat: add caption position control`, `fix: correct clip duration on upload`,
  `docs: expand self-hosting steps`) — it keeps history scannable and maps directly onto the version
  bump a change implies (see [Versioning & Releases](#versioning--releases) below).
- Keep PRs scoped to one concern where possible — small, reviewable PRs merge faster.
- Write commit messages that explain *why*, not just *what*.
- Reference the issue number your PR addresses (`Closes #12`).
- Make sure the app actually runs and, if you touched rendering, that a real MP4 comes out the other
  end — no mocked/stubbed features (see [Guardrails](#guardrails)).
- One approving review is required before merge.

## Code style

- TypeScript, Next.js App Router conventions.
- Run the linter before pushing: `npm run lint`.
- Prefer small, well-named functions/components over speculative abstractions.

## Versioning & Releases

RankReel follows [**Semantic Versioning 2.0.0**](https://semver.org/) — version numbers look like
`MAJOR.MINOR.PATCH` (e.g. `1.2.3`), and until the project reaches a stable `1.0.0`, versions look like
`0.MINOR.PATCH` and breaking changes can happen in a `MINOR` bump (standard semver pre-1.0 behavior).

**When each number moves:**

| Change | Bump | Example |
|---|---|---|
| Breaking change (post-1.0): removed/renamed config, incompatible DB migration, changed API shape | **MAJOR** | `1.4.2` → `2.0.0` |
| New feature, backward-compatible | **MINOR** | `1.4.2` → `1.5.0` |
| Bug fix, docs, refactor, no behavior change for users | **PATCH** | `1.4.2` → `1.4.3` |

**Tags:** every release is an annotated git tag prefixed with `v`, e.g. `v0.2.0`, `v1.0.0`. Tags are
created on `main` after the corresponding PR(s) are merged and verified working.

```bash
# Maintainers, cutting a release:
git checkout main && git pull
git tag -a v0.2.0 -m "v0.2.0 — short summary of what's new"
git push origin v0.2.0
```

**Releases:** each tag gets a corresponding [GitHub Release](https://github.com/amjadiqbal/rankreel/releases)
with human-readable notes (what's new, what's fixed, any breaking/upgrade notes), created via:

```bash
gh release create v0.2.0 --title "v0.2.0" --generate-notes
```

(`--generate-notes` drafts a changelog from merged PRs since the last tag — edit it for clarity before
publishing.) If you're contributing and think a merged PR deserves a mention in the next release notes,
say so in the PR description.

**Pre-release versions** (`v0.2.0-beta.1`, `v1.0.0-rc.1`) are fine for testing bigger changes before a
stable tag — mark them "pre-release" when creating the GitHub Release.

## Guardrails

These aren't arbitrary — they're the design boundaries that keep RankReel a tool you *own* rather than
a service someone else runs for you:

- **No billing, subscriptions, or usage metering** — ever. This is self-hosted software, not a SaaS.
- **No telemetry, analytics, or phone-home calls of any kind.** Instances run on contributors' and
  users' own infrastructure; nothing should call home.
- **Heavy video rendering never runs inside Vercel serverless functions** — they time out on anything
  non-trivial. Rendering runs locally (`@remotion/renderer`, see `worker/render.ts`) or, if you're
  adding cloud rendering support, via a proper long-running worker (e.g. Remotion Lambda, or a
  Railway/Render/Fly worker process) — never inline in a Vercel function.
- **Every database table has Row-Level Security** scoped to `owner_id = auth.uid()`. New tables need
  RLS policies in the same migration that creates them.
- **No mocked or stubbed features.** If you add a feature, it should actually work end-to-end — a
  render button that doesn't render, or a preview that shows fake data, doesn't belong in `main`.
- **Never commit secrets** — real Supabase/AWS credentials, `.env.local`, or personally identifiable
  media.

## Reporting bugs / requesting features

Use the GitHub issue templates under `.github/ISSUE_TEMPLATE/`. For security vulnerabilities, **do
not** open a public issue — see [SECURITY.md](SECURITY.md).

## Code of Conduct

By participating, you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md).
