# CalmBlock Release Browser Matrix

Last reviewed: 2026-04-07

This document is the per-release certification worksheet.

The operational rules live in:

- [release-browser-program.md](./release-browser-program.md)

Use this worksheet together with:

- [browser-support.md](./browser-support.md)
- [chromium-smoke-checklist.md](./chromium-smoke-checklist.md)
- [firefox-smoke-checklist.md](./firefox-smoke-checklist.md)
- [orion-smoke-checklist.md](./orion-smoke-checklist.md)
- [safari-smoke-checklist.md](./safari-smoke-checklist.md)

## Release Candidate Header

- Release version:
- Release date:
- Tested by:
- Notes:

## Certification Worksheet

| Target | Family or lane | Support state | Artifact or lane | Smoke pass | Known differences reviewed | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Chrome | Chromium | Supported | `chrome` | yes/no | yes/no | reference Chromium result |
| Edge | Chromium | Supported | `chrome` | yes/no | yes/no | |
| Brave | Chromium | Supported | `chrome` | yes/no | yes/no | |
| Vivaldi | Chromium | Supported | `chrome` | yes/no | yes/no | |
| Opera | Chromium | Supported | `chrome` | yes/no | yes/no | |
| Arc | Chromium | Supported | `chrome` | yes/no | yes/no | |
| Yandex | Chromium | Supported | `chrome` | yes/no | yes/no | |
| Firefox | Firefox family | Supported | `firefox` | yes/no | yes/no | reference Firefox-family result |
| LibreWolf | Firefox family | Supported | `firefox` | yes/no | yes/no | |
| Waterfox | Firefox family | Supported | `firefox` | yes/no | yes/no | |
| Floorp | Firefox family | Supported | `firefox` | yes/no | yes/no | |
| Zen | Firefox family | Supported | `firefox` | yes/no | yes/no | |
| Orion | Orion lane | Gated / under validation | `chrome` primary / `firefox` comparison if needed | yes/no | yes/no | capture artifact, compatibility mode, blocker state, version |
| Safari | Safari lane | Gated / under validation | Apple packaging/review lane | yes/no | yes/no | capture packaging path, review status, blockers |

## Gated Lane Notes

### Orion

- Primary artifact used:
- `firefox` comparison used?: yes/no
- Compatibility mode:
- Built-in blocker state:
- Browser version:
- Consecutive pass counter:

### Safari

- Packaging path status:
- Review/distribution lane status:
- Current blockers:
- Next release action:

## Core Smoke Coverage

Use the family checklist plus these baseline flows for each release:

- install/load
- popup open
- global toggle
- site toggle
- allowlist
- strict mode
- import/export where applicable
- live counters fallback
- update baseline behavior
