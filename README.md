# CalmBlock

CalmBlock is a calm, privacy-first content blocker for people who want strong defaults without living inside blocker settings.

It is open-source first: readable code, honest scope, and no hidden tracking behavior.

No telemetry. No analytics. No accounts. No remote code.

## Project purpose

CalmBlock exists to reduce browsing noise (ads, trackers, and common annoyances) while remaining understandable and maintainable for contributors.

This repository is optimized for:

- trust and transparency
- contributor onboarding
- privacy-preserving defaults
- predictable architecture over feature sprawl

## Why this project exists

Some blockers are extremely powerful but intimidating. Others are simple but opaque. CalmBlock aims for a middle path:

- strong curated defaults
- low-friction site controls
- clear tradeoffs
- maintainable implementation

## Supported browsers

- Chrome (Manifest V3 primary target)
- Microsoft Edge (Manifest V3 primary target)
- Firefox (shared codebase with lightweight compatibility handling)

Browser-store release is not the primary goal of this repository. Open-source quality is.

## Install (developer mode)

1. Install dependencies:

```bash
npm install
```

2. Build:

```bash
npm run build
```

3. Load unpacked extension:
- Chrome/Edge: `dist/chrome`
- Firefox: `dist/firefox`

## Development commands

- `npm run typecheck` -> TypeScript check (`tsc --noEmit`)
- `npm test` -> unit/content/integration-style tests
- `npm run build` -> build all browser targets
- `npm run build:chrome` -> build Chrome/Edge target
- `npm run build:firefox` -> build Firefox target
- `npm run lint` -> strict TypeScript gate

## Architecture summary

- `src/background`: service worker orchestration, ruleset sync, migration, popup APIs
- `src/content`: cosmetic filtering and annoyance suppression
- `src/popup`: quick controls and local feedback
- `src/options`: groups, allowlist, import/export, privacy explanations
- `src/shared`: typed stores, adapters, message contracts, DNR helpers
- `public/rules`: packaged DNR rules grouped as `ads`, `trackers`, `annoyances`, `strict`
- `tests`: unit, content, and integration-style tests

## Rulesets and scope

CalmBlock uses packaged DNR rules with four groups:

1. Ads
2. Trackers
3. Annoyances
4. Strict Privacy

Current rule coverage is a meaningful MVP baseline, not parity with mature blockers that have many years of filter engineering.

## Known limitations

- DNR constraints prevent full ABP/uBO feature parity
- Anti-adblock handling is intentionally conservative
- Strict mode can break some sites
- No remote list updates by design (packaged rules only)

## Privacy guarantees

- No telemetry
- No analytics SDKs
- No remote logging
- No accounts or cloud sync
- No remote code execution

Advanced debug behavior is local-only and opt-in.

## Contributing

See:

- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [ROADMAP.md](./ROADMAP.md)
- [CHANGELOG.md](./CHANGELOG.md)
- [RELEASE_READINESS.md](./RELEASE_READINESS.md)

## Support the project

CalmBlock is maintained as an open-source volunteer project.

You can support maintenance through GitHub Sponsors:

- [GitHub Sponsors - Krypera](https://github.com/sponsors/Krypera)

Support helps fund:

- rule maintenance and breakage triage
- cross-browser testing and fixes
- documentation and contributor support
- long-term upkeep and release hygiene

## Non-goals

- Full uBlock Origin parity
- Custom ABP parser from scratch
- Paywall bypass features
- Telemetry dashboards
- Cloud account/sync model
- Remote script update mechanisms

