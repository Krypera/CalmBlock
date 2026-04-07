# CalmBlock Roadmap

This roadmap is intentionally practical. CalmBlock favors trust, stability, and clarity over maximal feature count.

## v0.2 Focus (ordered execution plan)

v0.2 is the release where the existing architecture should convert into higher real-world blocking impact.

Execution order:

1. Rule coverage + annotation
2. Real browser E2E
3. Fixture expansion
4. Debug/release polish

### 1) Rule Coverage + Annotation

Goal:
- Grow `ads`, `trackers`, `annoyances`, and `strict` rulesets in controlled batches.

Required outcomes:
- New entries stay tied to provenance and fixture context in the rules program.
- `public/rules/metadata.json` shows higher `annotatedRules` and stronger per-group annotation coverage.
- High-risk or high-impact additions default to full annotations: `provenance`, `reason`, `fixture`, `tags`.

Primary files:
- `public/rules/metadata.json`
- `scripts/build-rules.mjs`
- `scripts/rules/sources.json`
- `scripts/rules/sources/*.list`

Done criteria:
- Rule volume increases in all four groups with no schema regressions.
- Annotation coverage for newly added rules is the default, not the exception.
- Rules builder and pipeline tests are green.

### 2) Real Browser E2E

Goal:
- Add real-browser (non-JSDOM) E2E for Chrome and Firefox reference lanes.

Required flows:
- extension load
- popup state render
- global toggle
- site pause toggle
- allowlist overflow warning visibility
- live counter fallback behavior

Primary files:
- `scripts/smoke-dist.mjs` (artifact contract stays; browser E2E becomes an additional lane)
- `docs/release-browser-program.md`

Done criteria:
- CI can run at least one deterministic E2E lane for Chrome and one for Firefox.
- Failures produce actionable output tied to release certification.

### 3) Fixture Expansion (Heuristic hardening)

Goal:
- Increase resilience of `AnnoyanceEngine` and `CosmeticEngine` through richer, realistic fixtures.

Priority fixture categories:
- false-positive modal scenarios
- shadow DOM variants
- framework-generated consent UI
- strict mode breakage scenarios

Primary files:
- `tests/content/annoyanceEngine.test.ts`
- `tests/content/cosmeticEngine.test.ts`
- `tests/content/fixtures/*`

Done criteria:
- New fixture classes exist for each category above.
- Regressions are caught by tests before release packaging.

### 4) Debug/Release Polish

Goal:
- Improve operator visibility in popup/debug and tighten browser-family release automation.

Required outcomes:
- Popup/debug surfaces expose capability matrix, storage mode, allowlist overflow state, and live telemetry status clearly.
- Release scripts and release docs are tightly coupled for Chromium/Firefox certification.
- Safari/Orion remain explicitly gated with visible signals and no ambiguous support language.

Primary files:
- `src/shared/popupState.ts`
- `src/debug/index.ts`
- `scripts/package.mjs`
- `RELEASE_READINESS.md`
- `docs/release-browser-program.md`

Done criteria:
- Operator-facing diagnostics reduce triage time for browser-specific behavior.
- Release checklists and automation lanes match without drift.

## Near Term (post-v0.2)

- Add stronger import/export validation edge-case tests.
- Keep browser behavior notes in README/options in sync as Firefox DNR feedback support evolves.

## Mid Term

- Add an optional advanced element-hide helper with strict guardrails.
- Add contributor docs for triaging site-breakage reports.
- Start Safari support as a separate packaging and distribution workstream.

## Long Term

- Improve category-level transparency for blocked requests.
- Expand strict mode controls with safer defaults and clearer risk messaging.
- Improve local-only debug ergonomics without weakening privacy guarantees.

## Explicitly Not Planned

- Account systems
- Telemetry or analytics dashboards
- Remote-code update mechanisms
- "Block everything" marketing claims
