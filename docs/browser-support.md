# CalmBlock Browser Support Contract

Last reviewed: 2026-04-07

This document defines CalmBlock's public browser support contract.

Evidence status:

- Contract tiers are defined.
- Public release evidence is only considered complete when `release-browser-matrix.md` is filled for a specific release tag.
- Until a release matrix is filled and published, support tiers should be read as certification targets rather than already-proven claims.

The operational source of truth for release and QA lives in:

- [release-browser-program.md](./release-browser-program.md)

Per-release certification records live in:

- [release-browser-matrix.md](./release-browser-matrix.md)

## Canonical Artifacts

- Chromium path: `calmblock-chrome-v<version>.zip`
- Firefox path: `calmblock-firefox-v<version>.zip`
- Stable Chromium direct-download alias: `calmblock-chrome-latest.zip`
- Stable Firefox direct-download alias: `calmblock-firefox-latest.zip`

No browser-specific build targets are created beyond `chrome` and `firefox`.

## Support Tiers

| Tier | Browsers | Artifact | Requirement |
| --- | --- | --- | --- |
| Certification-target (Chromium) | Chrome, Edge, Brave, Vivaldi, Opera, Arc, Yandex | `chrome` | Release-blocking certification targets |
| Certification-target (Firefox family) | Firefox (reference), LibreWolf, Waterfox, Floorp, Zen | `firefox` | Release-blocking certification targets with Firefox as reference target |
| Gated / under validation | Orion | `chrome` first, `firefox` comparison | Promotion only after gate criteria are met |
| Gated / under validation | Safari | none yet | Separate Apple packaging/distribution lane required before official support |

## Support Rules

- Official Chromium and Firefox-family support is release-blocking.
- Orion and Safari are explicit targets, but they remain gated until their promotion criteria are met.
- No browser-specific build targets are created beyond `chrome` and `firefox`.
- Safari does not inherit support from either existing artifact.
- Orion starts with the `chrome` artifact and uses `firefox` comparison when promotion work needs it.

Checklist and release references:

- [release-browser-program.md](./release-browser-program.md)
- [chromium-smoke-checklist.md](./chromium-smoke-checklist.md)
- [firefox-smoke-checklist.md](./firefox-smoke-checklist.md)
- [orion-smoke-checklist.md](./orion-smoke-checklist.md)
- [safari-support.md](./safari-support.md)

## Known Differences and Limits

Known differences, certification rules, and promotion criteria are centralized in:

- [release-browser-program.md](./release-browser-program.md)

## Triage Scope Rules

Use issue templates to classify reports as:

- supported browser issue
- gated / under validation browser issue
- out-of-scope browser issue

If scope is unclear, treat it as gated / under validation first, then reclassify after reproduction.
