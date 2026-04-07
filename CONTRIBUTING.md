# Contributing to CalmBlock

Thanks for helping improve CalmBlock.

This project values calm UX, honest privacy guarantees, and maintainable code over feature sprawl.

## Ground rules

- Keep privacy-first guarantees intact:
  - no telemetry
  - no analytics
  - no remote code execution
  - no hidden network calls unrelated to blocking behavior
- Prefer small, reviewable pull requests.
- Document tradeoffs clearly when behavior changes.
- Do not over-claim capabilities in code comments or docs.

## Getting started

1. Fork and clone.
2. Install dependencies: `npm install`
3. Validate locally:
   - `npm run typecheck`
   - `npm test`
   - `npm run build`

## Branch and PR guidance

- Use focused branches (`feature/...`, `fix/...`, `docs/...`).
- Include problem statement and expected behavior in PR description.
- Mention privacy/security implications explicitly when touching:
  - permissions
  - background/service worker logic
  - message passing
  - import/export and storage logic

## Code style expectations

- TypeScript strictness should remain enabled.
- Keep abstractions small and explicit.
- Avoid adding heavy dependencies without strong reason.
- Prefer deterministic behavior over cleverness.

## Testing expectations

At minimum, add or update tests when changing:

- settings and allowlist behavior
- ruleset mapping and toggling
- popup state derivation
- content filtering logic

Avoid flaky tests that depend on live third-party pages.

## Site-breakage triage flow

When reporting "this site broke", use this repeatable flow:

1. Reproduce with CalmBlock enabled and note exact URL/host.
2. Toggle CalmBlock off for that site and reload.
3. If the breakage disappears, open `options -> debug` with advanced mode enabled.
4. Copy the JSON `triageBundle` from the debug output.
5. Open the "Site breakage report" issue template and include:
   - repro steps
   - expected vs actual behavior
   - `triageBundle`
   - screenshot/video if possible

This keeps breakage reports actionable and avoids guesswork.

## Documentation expectations

If behavior or scope changes, update:

- `README.md`
- `ROADMAP.md` (if milestone implications exist)
- `CHANGELOG.md` (for user-facing impact)
- `RELEASE_READINESS.md` (if release gates are affected)

## Security and privacy disclosures

If you find a security/privacy issue, please open an issue with reproduction details and impact.  
Do not hide a risky behavior under a vague commit message.
