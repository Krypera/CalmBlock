# CalmBlock Release Browser Program

Last reviewed: 2026-04-07

This document is the operational source of truth for browser support in CalmBlock.

Use it to answer:

- which artifact is canonical for each browser family
- which targets are release-blocking
- which lanes stay gated or manual
- which known differences must be reviewed before release
- how issue triage scope should be classified

Related documents:

- [browser-support.md](./browser-support.md)
- [release-browser-matrix.md](./release-browser-matrix.md)
- [chromium-smoke-checklist.md](./chromium-smoke-checklist.md)
- [firefox-smoke-checklist.md](./firefox-smoke-checklist.md)
- [orion-smoke-checklist.md](./orion-smoke-checklist.md)
- [safari-support.md](./safari-support.md)
- [safari-smoke-checklist.md](./safari-smoke-checklist.md)

## Support States

| State | Meaning | Release impact |
| --- | --- | --- |
| Supported | Official support promise with repeatable certification | Release-blocking |
| Gated / under validation | Explicit target with a defined promotion path, but not yet official | Manual review every release |
| Out of scope | Not covered by CalmBlock's operational support promise | Not release-blocking |

## Canonical Artifact Lanes

| Family or lane | Browsers | Canonical artifact or lane | Current state |
| --- | --- | --- | --- |
| Chromium family | Chrome, Edge, Brave, Vivaldi, Opera, Arc, Yandex | `calmblock-chrome-v<version>.zip` | Supported |
| Firefox family | Firefox (reference), LibreWolf, Waterfox, Floorp, Zen | `calmblock-firefox-v<version>.zip` | Supported |
| Orion lane | Orion | `chrome` primary, `firefox` comparison when needed | Gated / under validation |
| Safari lane | Safari | Separate Apple packaging/review lane | Gated / under validation |

Rules for artifact lanes:

- CalmBlock ships only two extension artifacts today: `chrome` and `firefox`.
- Each tagged release should also publish stable direct-download aliases: `calmblock-chrome-latest.zip` and `calmblock-firefox-latest.zip`.
- No browser-specific build target is created for Brave, Vivaldi, Opera, Arc, Yandex, LibreWolf, Waterfox, Floorp, or Zen.
- Safari does not inherit support from the current `chrome` or `firefox` artifacts.
- Orion validation starts with the `chrome` artifact, but `firefox` comparison remains part of promotion work when behavior is unclear.

## Release Certification Model

### Release-blocking families

These groups must pass certification before release sign-off:

- Chromium family
- Firefox family

### Manual certification lanes

These lanes must be reviewed every release, but they are not treated as unconditional official support:

- Orion
- Safari

### Certification record

Every release candidate should update:

- [release-browser-matrix.md](./release-browser-matrix.md)

That worksheet records:

- per-browser pass/fail state
- artifact or lane used
- known-difference review
- gate notes for Orion and Safari

## Automation Boundary

CalmBlock now keeps two separate confidence layers on purpose:

- `scripts/smoke-dist.mjs` is an artifact contract smoke. It validates packaged files, rules metadata, and bundled background/popup/options/content entrypoints inside a mocked browser environment.
- Browser-family certification is still manual and release-blocking. The smoke script does not replace real install, permission, popup, built-in-blocker, or browser-policy checks.

This means artifact smoke is expected on every build, while browser checklists and release matrix updates remain the support contract.

## v0.2 E2E Expansion

v0.2 adds a third layer between artifact smoke and full manual certification: real-browser scripted E2E for reference browsers.

Required reference lanes:

- Chrome (Chromium family reference)
- Firefox (Firefox family reference)

Minimum scripted flows per lane:

- extension install/load
- popup state render
- global protection toggle
- site pause toggle
- allowlist overflow warning visibility
- live counter fallback visibility

Policy:

- Failing reference E2E blocks release-candidate promotion for that family until triaged.
- Passing reference E2E does not remove manual certification requirements for family/fork/browser-policy differences.

Automation command:

- `npm run e2e:browser:setup` installs Playwright Chromium/Firefox binaries for local runs.
- `npm run e2e:browser:chrome` runs strict Chrome-only reference E2E.
- `npm run e2e:browser:firefox` runs strict Firefox-only reference E2E.
- `npm run e2e:browser` runs Chrome and Firefox reference flows in real browsers when runtimes are available.
- `npm run e2e:browser:strict` treats missing browser runtimes as failures (CI-friendly).
- CI uses strict mode as a hard gate and installs Playwright Chromium/Firefox before execution.

## Family Requirements

### Chromium Family

Browsers:

- Chrome
- Edge
- Brave
- Vivaldi
- Opera
- Arc
- Yandex

Certification rules:

- Use the single `chrome` artifact for all seven browsers.
- Run the Chromium smoke checklist on all seven browsers.
- Treat this family as release-blocking.
- Record browser-specific caveats in the release matrix when UI, permissions, built-in blockers, or install flow differ.

Known differences and limitations:

- Built-in blockers can create double-blocking noise.
- Private/incognito defaults can differ by browser policy.
- Permission prompts and extension surfaces can differ from Chrome baseline.

Per-browser notes:

- Chrome: reference Chromium result for install flow, permissions, and popup behavior.
- Edge: tracking-prevention defaults and extension UI wording can differ from Chrome.
- Brave: disable Brave Shields during certification.
- Vivaldi: disable built-in Tracker and Ad Blocking during certification.
- Opera: disable built-in ad blocker/tracker blocker during certification.
- Arc: popup focus and permissions surfaces can differ from mainstream Chromium UX.
- Yandex: built-in filtering and browser policy behavior can differ from Chrome-family defaults.

Checklist:

- [chromium-smoke-checklist.md](./chromium-smoke-checklist.md)

### Firefox Family

Browsers:

- Firefox
- LibreWolf
- Waterfox
- Floorp
- Zen

Certification rules:

- Use the single `firefox` artifact for the whole family.
- Treat Firefox as the reference target for expected behavior.
- Run the Firefox-family smoke checklist on all five browsers.
- Treat this family as release-blocking.
- Record optional-permission, private-browsing, and feedback/counter differences in the release matrix.

Known differences and limitations:

- Optional permission behavior can differ by browser policy or version.
- DNR feedback support can differ, so live counters must fall back clearly.
- Private browsing behavior can differ across forks.
- ESR-based forks can lag Firefox stable behavior.

Per-browser notes:

- Firefox: reference baseline for install flow, permissions, counters, and regressions.
- LibreWolf: privacy hardening can alter permission defaults and private-window behavior.
- Waterfox: release cadence can affect API parity timing.
- Floorp: ESR alignment can introduce lag versus Firefox stable behavior.
- Zen: custom UX and policy defaults can affect prompts and private-window behavior.

Checklist:

- [firefox-smoke-checklist.md](./firefox-smoke-checklist.md)

### Orion Lane

Certification rules:

- Start with the `chrome` artifact as the primary validation path.
- Use the `firefox` artifact as a comparison path when:
  - an Orion-only regression appears
  - `chrome` behavior is unclear
  - a compatibility comparison is needed before promotion
- Record artifact choice, compatibility mode, built-in blocker state, and browser version on each Orion check.
- Do not mark Orion as Official until it passes two consecutive release cycles.

Known differences and limitations:

- WebExtensions API completeness can vary by Orion version.
- Compatibility mode can materially change behavior.
- Built-in blocker state can change perceived results.
- Browser maturity should be treated as version-sensitive.

Promotion rule:

- Orion stays `Gated / under validation` until two consecutive release matrices record a full pass with no blocker-level regression.

Checklist:

- [orion-smoke-checklist.md](./orion-smoke-checklist.md)

### Safari Lane

Certification rules:

- Safari has its own packaging, distribution, and review lane.
- Do not reuse current `chrome` or `firefox` artifacts as if they were Safari releases.
- Track packaging readiness, review readiness, and blocker-level risks every release.
- Do not mark Safari as Official until the Safari lane exists and passes repeated release review.

Known differences and limitations:

- Packaging and distribution are Apple-specific.
- Permissions and service worker assumptions may differ from Chromium and Firefox.
- Feedback/live-counter assumptions may not map directly.
- Review and signing are part of release operations, not a postscript.

Promotion rule:

- Safari stays `Gated / under validation` until:
  - a real Safari packaging path exists
  - Apple review/distribution workflow is documented
  - Safari-specific smoke validation exists
  - at least two release cycles complete without unresolved blocker-level regressions

Workstream details:

- [safari-support.md](./safari-support.md)
- [safari-smoke-checklist.md](./safari-smoke-checklist.md)

## Triage Scope

Issue triage must use one of these scope labels:

- `Supported browser issue`
- `Gated / under validation browser issue`
- `Out-of-scope browser issue`

Guidance:

- Use `Supported` for Chromium and Firefox-family targets.
- Use `Gated / under validation` for Orion and Safari workstream reports.
- Use `Out-of-scope` for browsers outside this program unless the report clearly reproduces in a supported target.

## Release Flow Summary

For each release candidate:

1. Build the canonical `chrome` and `firefox` artifacts.
2. Publish `calmblock-chrome-latest.zip` and `calmblock-firefox-latest.zip` alongside the versioned GitHub release assets.
3. Run Chromium and Firefox-family smoke checklists.
4. Review Orion gate status and update pass history.
5. Review Safari lane status and blockers.
6. Update [release-browser-matrix.md](./release-browser-matrix.md).
7. Confirm `RELEASE_READINESS.md`, `RELEASE_TEMPLATE.md`, and issue templates still match this program.
