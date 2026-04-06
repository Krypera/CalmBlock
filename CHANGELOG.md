# Changelog

All notable changes to this project will be documented in this file.

The format loosely follows Keep a Changelog and semantic versioning intent.

## [Unreleased]

### Added

- Open-source trust docs:
  - `CONTRIBUTING.md`
  - `ROADMAP.md`
  - `RELEASE_READINESS.md`
- GitHub Sponsors funding metadata and `.github/FUNDING.yml`.
- `typecheck` and `lint` scripts for local quality gates.
- Expanded MVP DNR rule coverage for:
  - `ads`
  - `trackers`
  - `annoyances`
  - `strict`
- Storage-key migration support from legacy `quietblock.*` keys to `calmblock.*`.

### Changed

- Project branding renamed from QuietBlock to CalmBlock across code, UI, docs, and manifests.
- README restructured for open-source clarity, trust guarantees, and contribution flow.
- Project narrative shifted from store-readiness framing to sustainability + contributor readiness.

### Fixed

- Type-check command availability via `npm run typecheck`.

### Notes

- Ruleset coverage is still a curated MVP baseline and not parity with mature blockers.
