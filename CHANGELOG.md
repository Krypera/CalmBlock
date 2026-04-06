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
  - `assets/popup-preview.png`
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
- Project narrative shifted from store-readiness framing to sustainability + contributor readiness.
- Repository support flow shifted from GitHub Sponsors to a quieter crypto-only support page.
- `SUPPORT.md` rewritten to keep support optional, pressure-free, and crypto-only.

### Fixed

- Type-check command availability via `npm run typecheck`.

### Notes

- Ruleset coverage is still a curated MVP baseline and not parity with mature blockers.
