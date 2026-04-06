# CalmBlock

<div align="center">
  <p><strong>A calm, privacy-first content blocker with strong defaults and a low-noise interface.</strong></p>
  <p>No telemetry. No analytics. No accounts. No remote code.</p>
</div>

CalmBlock is built for people who want a quieter web without turning every tab into a configuration project.

It sits in the middle on purpose: simpler than maximalist blockers, more transparent than "just trust us" extensions.

## At a glance

| Calm by default | Privacy first | Open-source first | Low-noise controls |
| --- | --- | --- | --- |
| Strong default groups without a maze of switches | No telemetry, analytics, cloud sync, or remote code | Readable code, explicit tradeoffs, contributor-friendly structure | Fast site toggle, allowlist, and simple group controls |

## What CalmBlock is trying to do

- reduce ads, trackers, and common annoyances
- stay understandable for contributors
- keep permissions and behavior easy to explain
- favor trust and maintainability over feature sprawl

## What it is not trying to be

- a full uBlock Origin clone
- a custom ABP engine from scratch
- a paywall bypass tool
- a telemetry-driven product

## Supported browsers

- Chrome
- Microsoft Edge
- Firefox

Manifest V3 is the main architecture target. Browser-store release is not the main focus of this repository; open-source quality is.

## Install

```bash
npm install
npm run build
```

Load the unpacked build from:

- `dist/chrome` for Chrome and Edge
- `dist/firefox` for Firefox

## Development

```bash
npm run typecheck
npm test
npm run build
```

Additional commands:

- `npm run build:chrome`
- `npm run build:firefox`
- `npm run lint`

## Project shape

- `src/background`: service worker orchestration, ruleset sync, migration, popup APIs
- `src/content`: cosmetic filtering and annoyance suppression
- `src/popup`: quick controls and local feedback
- `src/options`: group settings, allowlist, import/export, privacy explanations
- `src/shared`: typed stores, adapters, contracts, DNR helpers
- `public/rules`: packaged DNR rules for `ads`, `trackers`, `annoyances`, `strict`
- `tests`: unit, content, and integration-style coverage

## Scope and limits

CalmBlock uses packaged DNR rules and a deliberately conservative feature set.

Current rule coverage is a meaningful MVP baseline, not parity with mature blockers that have had years of filter tuning.

Known limitations:

- DNR constraints prevent full ABP/uBO parity
- anti-adblock handling is intentionally conservative
- strict mode can break some sites
- remote rule updates are intentionally not part of the model

## Privacy model

- no telemetry
- no analytics SDKs
- no remote logging
- no accounts or cloud sync
- no remote code execution

Advanced debug behavior stays local-only and opt-in.

## Contributing

- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [ROADMAP.md](./ROADMAP.md)
- [CHANGELOG.md](./CHANGELOG.md)
- [RELEASE_READINESS.md](./RELEASE_READINESS.md)

## Support

CalmBlock is maintained slowly and deliberately.

If it makes your browsing calmer and you want to help keep the project healthy, support is welcome. The support model is intentionally quiet: crypto-only, clear, and pressure-free.

Support also helps keep CalmBlock sustainable while I balance it with school.

Support details live here:

- [Support CalmBlock](./SUPPORT.md)

## Non-goals

- full uBlock Origin parity
- custom ABP parser from scratch
- paywall bypass features
- telemetry dashboards
- cloud account/sync model
- remote script update mechanisms
