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

## Current status notes

- CalmBlock currently targets a trustworthy MVP baseline.
- Storage keys were renamed to `calmblock.*` with legacy migration logic for prior `quietblock.*` keys.
- Rules are intentionally curated and conservative.
- Site-breakage handling and rule coverage depth are ongoing work.
- README now includes badges, install flow clarity, and repo-facing visual polish.
