# Changelog

All notable changes to this project will be documented in this file.

The format loosely follows Keep a Changelog and semantic versioning intent.

## [Unreleased]

## [0.1.1] - 2026-04-07

### Added

- Package output now includes stable direct-download aliases: `calmblock-chrome-latest.zip` and `calmblock-firefox-latest.zip`.
- README now exposes browser-specific direct download links backed by stable GitHub release asset names.
- CI now includes a separate `package-validation` job that builds zip packages and validates packaged outputs.
- Rules pipeline now records richer metadata (`generatedAt`, `idRange`, `sourceDigest`, `changes`) for release tracking.
- New regression tests for rules-builder validation and expanded content fixtures for cosmetic/annoyance behavior.

### Changed

- DNR source lists expanded across `ads`, `trackers`, `annoyances`, and `strict` groups for stronger MVP coverage.
- Package sanity checks were tightened in `scripts/package.mjs` for manifest and rules metadata validation before release distribution.
- Site-breakage triage format is now versioned (`calmblock.triage.v1`) and aligned between debug output and issue template.
- Version bumped from `0.1.0` to `0.1.1` to reflect beta-hardening and release-process improvements.

### Added

- Open-source trust docs:
  - `CONTRIBUTING.md`
  - `ROADMAP.md`
  - `RELEASE_READINESS.md`
- GitHub project-quality files:
  - CI workflow (`.github/workflows/ci.yml`)
  - issue templates (`bug_report`, `filter_request`)
  - PR template
  - security policy (`.github/SECURITY.md`)
- Repo visibility files:
  - `assets/banner.svg`
  - `assets/interface-showcase.svg`
  - `docs/index.html`
  - `REPO_SETUP.md`
  - `RELEASE_TEMPLATE.md`
  - `releases/v0.1.0-alpha.md` (draft)
- `typecheck` and `lint` scripts for local quality gates.
- Expanded MVP DNR rule coverage for:
  - `ads`
  - `trackers`
  - `annoyances`
  - `strict`
- Storage-key migration support from legacy `quietblock.*` keys to `calmblock.*`.

### Changed

- Project branding renamed from QuietBlock to CalmBlock across code, UI, docs, and manifests.
- README restructured as a cleaner GitHub landing page (badges, install steps, visual header).
- README visual hierarchy tightened around a single banner plus interface overview, replacing the redundant single-frame popup preview.
- Project narrative shifted from store-readiness framing to sustainability + contributor readiness.
- Repository support flow shifted from GitHub Sponsors to a quieter crypto-only support page.
- `SUPPORT.md` rewritten to keep support optional, pressure-free, and crypto-only.
- Popup and settings surfaces softened with more rounded controls, calmer spacing, and overflow-safe layouts.
- Advanced mode now gates debug/import/export behavior (not just link visibility) and debug page self-protects when advanced mode is off.
- Popup reload hint behavior is now explicit: global toggle applies instantly, site-level toggle is reload-recommended.
- Badge state now follows effective protection state (global + site) for more consistent feedback.
- Rulesets are now generated via reproducible pipeline from source lists (`scripts/rules/sources/*.list`).
- Site-breakage reporting now has dedicated template + debug triage bundle flow.
- Docs page is now real project documentation (not a placeholder notice).
- CI now runs build artifact smoke checks (manifest/rules/entrypoints) before uploading artifacts.
- Packaging now validates source sanity before zip creation to prevent accidental wrong-file bundles.
- Trust documentation expanded with permission rationale, explicit limits, and "what is not blocked."
- Background toggle flow now suppresses duplicate storage/message sync passes and keeps all-tab propagation consistent.
- Reload hint model is now explicitly transient (response-driven), not part of persisted popup state.
- Added integration regression coverage for global/site propagation across multiple tabs.

### Fixed

- Type-check command availability via `npm run typecheck`.
- Current-page block totals now use current-tab DNR access and count only matched blocking rulesets.
- Import/export and allowlist edge handling hardened with added parser and larger regression coverage.

### Notes

- Ruleset coverage is still a curated MVP baseline and not parity with mature blockers.
