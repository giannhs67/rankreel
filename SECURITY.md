# Security Policy

RankReel handles auth sessions, Supabase service-role keys, and (if you enable Remotion Lambda) AWS
credentials. Because it's self-hosted, a vulnerability here can affect every instance running the
affected version — please report privately rather than filing a public issue.

## Reporting a vulnerability

Preferred: open a [GitHub Security Advisory](../../security/advisories/new) on this repository (private
by default, visible only to maintainers until resolved).

Alternative: email **ahadnasir123@gmail.com** with:

- A description of the vulnerability and its impact.
- Steps to reproduce (or a proof of concept).
- Affected version/commit, if known.

Please do not include real Supabase/AWS credentials or other secrets in your report.

## What to expect

- Acknowledgement within a few days.
- We'll work with you to understand and validate the issue, then prepare and release a fix.
- Credit in the release notes if you'd like it (or anonymity, if you prefer).

## Supported versions

This project is pre-1.0 and evolving quickly — please always test against the latest `main` before
reporting, and expect fixes to land there rather than on older tags.
