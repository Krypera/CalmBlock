# Release Readiness (Open-Source)

This checklist tracks whether CalmBlock is ready to present as a serious open-source project.

Scope here is not browser-store submission. Scope is trust, maintainability, and contributor readiness.

## Quality gates

- [x] `npm run typecheck` passes
- [x] `npm test` passes
- [x] `npm run build` passes
- [x] No new dependency introduces telemetry/remote-code risk

## Privacy gates

- [x] No telemetry paths added
- [x] No analytics SDKs added
- [x] No account/cloud sync behavior introduced
- [x] No remote executable/script loading behavior introduced

## Documentation gates

- [x] `README.md` reflects actual capabilities and limits
- [x] `CONTRIBUTING.md` explains contribution flow
- [x] `ROADMAP.md` is current
- [x] `CHANGELOG.md` updated for notable changes
- [x] Permissions and privacy behavior are explained plainly
- [x] Community templates exist (bug/filter/PR/security)

## Ruleset gates

- [x] Rule groups remain consistent: ads/trackers/annoyances/strict
- [x] Rules are meaningful enough for MVP baseline
- [x] Known breakage risks are documented honestly
- [x] No claim of full parity with maximalist blockers

## Maintenance gates

- [x] New code includes focused tests where behavior changed
- [x] Advanced/debug behavior remains opt-in and local-only
- [x] Import/export paths validate input safely
- [x] CI workflow validates typecheck/test/build on pushes and PRs
- [x] CI validates package zip generation and package sanity checks

## Browser support gates

- [x] Public contract is documented in `README.md` and `docs/browser-support.md`
- [x] Operational browser program is documented in `docs/release-browser-program.md`
- [ ] Per-release browser worksheet is updated in `docs/release-browser-matrix.md`
- [ ] Chromium family is certified with one canonical artifact: `calmblock-chrome-v<version>.zip`
- [ ] Firefox family is certified with one canonical artifact: `calmblock-firefox-v<version>.zip`
- [ ] Chromium smoke checklist completed for Chrome, Edge, Brave, Vivaldi, Opera, Arc, and Yandex
- [ ] Firefox-family smoke checklist completed for Firefox, LibreWolf, Waterfox, Floorp, and Zen
- [ ] Known differences and built-in blocker notes were reviewed against `docs/release-browser-program.md`
- [ ] Orion gate status was reviewed and recorded:
  - [ ] `chrome` artifact result captured
  - [ ] `firefox` comparison captured if needed
  - [ ] compatibility mode, built-in blocker state, and version recorded
  - [ ] consecutive-pass counter updated
- [ ] Safari lane status was reviewed and recorded:
  - [ ] packaging path state is current
  - [ ] Apple review/distribution state is current
  - [ ] Safari smoke checklist reviewed
  - [ ] blocker-level risks are tracked honestly
- [ ] Issue templates and triage docs still classify reports as:
  - [ ] supported browser issue
  - [ ] gated / under validation browser issue
  - [ ] out-of-scope browser issue

## v0.2 execution gates

- [ ] Rule coverage expansion shipped for all groups (`ads`, `trackers`, `annoyances`, `strict`)
- [ ] Rules metadata reflects higher annotation coverage for newly added high-risk/high-impact rules
- [ ] Chrome real-browser E2E lane covers: load, popup, global toggle, site pause, allowlist overflow, live-counter fallback
- [ ] Firefox real-browser E2E lane covers: load, popup, global toggle, site pause, allowlist overflow, live-counter fallback
- [ ] Heuristic fixture expansion includes:
  - [ ] false-positive modal scenarios
  - [ ] shadow DOM scenarios
  - [ ] framework-generated consent UI scenarios
  - [ ] strict-mode breakage scenarios
- [ ] Popup/debug surfaces clearly expose:
  - [ ] capability matrix
  - [ ] storage mode
  - [ ] allowlist overflow status
  - [ ] live telemetry status
- [ ] Release automation + docs remain aligned for browser-family certification and gated lanes

## Current status notes

- CalmBlock currently targets a trustworthy MVP baseline.
- Storage keys were renamed to `calmblock.*` with legacy migration logic for prior `quietblock.*` keys.
- Rules are intentionally curated and conservative.
- Site-breakage handling and rule coverage depth are ongoing work.
- README now includes badges, install flow clarity, and repo-facing visual polish.
