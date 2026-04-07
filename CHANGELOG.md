# Changelog

All notable changes to this project will be documented in this file.

The format loosely follows Keep a Changelog and semantic versioning intent.

## [Unreleased]

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

### Fixed

- Type-check command availability via `npm run typecheck`.
- Current-page block totals now use current-tab DNR access and count only matched blocking rulesets.
- Import/export and allowlist edge handling hardened with added parser and larger regression coverage.

### Notes

- Ruleset coverage is still a curated MVP baseline and not parity with mature blockers.
