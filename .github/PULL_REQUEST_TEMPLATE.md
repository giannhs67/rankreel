## What does this PR do?

<!-- Brief description. Link the issue/milestone this addresses, e.g. "Closes #12, part of M3". -->

## How was this tested?

<!-- Ran locally against your own Supabase project? Rendered a real MP4? Describe how you verified it. -->

## Checklist

- [ ] I read [CONTRIBUTING.md](../CONTRIBUTING.md) and [ClaudePrompt.md](../ClaudePrompt.md).
- [ ] This doesn't add billing/SaaS/multi-tenant/telemetry features (see guardrails in ClaudePrompt.md §7).
- [ ] Heavy rendering (if touched) still happens off-Vercel (Lambda/worker), not in a Vercel function.
- [ ] No secrets, real credentials, or `.env.local` were committed.
- [ ] I updated `memory/STATE.md` (and `memory/DECISIONS.md` if I made a non-obvious call).
- [ ] I ticked the relevant box(es) in `ROADMAP.md`, if applicable.
- [ ] The app runs locally and the feature actually works end-to-end (no mocked/stubbed behavior).
