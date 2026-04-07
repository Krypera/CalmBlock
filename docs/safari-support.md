# CalmBlock Safari Support Workstream

Last reviewed: 2026-04-07

Safari is an official target workstream for CalmBlock, but it is not covered by the current `chrome` or `firefox` artifact flow.

Operational source of truth:

- [release-browser-program.md](./release-browser-program.md)

## Target Scope

Goal:

- ship a real Safari lane with Apple-compatible packaging
- preserve CalmBlock's privacy-first model
- keep support claims honest until packaging, review, and verification are in place

Current status:

- targeted
- planned
- not yet release-certified

## Why Safari Is A Separate Workstream

Safari should not be treated as "probably works with the Chrome build."

Reasons:

- Safari Web Extensions use Apple-specific tooling and packaging flow.
- Distribution can involve App Store Connect and TestFlight, not just direct zip artifacts.
- Review and signing expectations differ from current Chromium/Firefox workflows.
- Runtime behavior around permissions, service workers, and feedback APIs may diverge from current assumptions.

## Packaging Options

Practical options to evaluate:

1. Xcode-based Safari Web Extension conversion/project packaging
2. App wrapper plus Safari Web Extension distribution through Apple channels
3. Local development lane for Safari testing before App Store/TestFlight distribution

Recommended repo stance for now:

- do not pretend an existing `chrome` or `firefox` package is the Safari package
- do not add a fake Safari build target to the normal `build` or `package:all` flow yet
- keep Safari as a separate planned lane until Apple packaging choices are implemented

## App Store Connect / TestFlight / Safari Web Extension Notes

- Safari distribution may require an Apple developer workflow outside current zip packaging.
- TestFlight can be relevant for pre-release validation once a Safari app/container exists.
- App Store Connect review becomes part of release operations once Safari moves beyond planning.
- Safari Web Extension packaging needs its own signing, archive, and review checklist.

## Known Risks

- Browser detection:
  - repo historically assumed `chrome` / `firefox` / `edge`; Safari needs explicit handling in runtime/debug flows.
- Permissions:
  - optional permission behavior may differ from Chromium/Firefox expectations.
- DNR feedback / live counters:
  - current live-counter assumptions may not map cleanly to Safari behavior.
- Manifest / packaging assumptions:
  - current repo assumes direct zip-based packaging and MV3-style manifest handling.
- Service worker lifecycle:
  - background/service worker behavior may differ enough to need Safari-specific validation.

## Official Support Entry Criteria

Safari should move from workstream to official support only when all of these are true:

- Safari packaging path is implemented and documented
- Apple distribution/review lane is defined
- Safari-specific smoke checklist exists and is used
- core flows are validated:
  - install/load
  - popup
  - global toggle
  - site toggle
  - rules activation
  - content scripts
  - fallback behavior for missing feedback capabilities
- at least two release cycles complete with current Safari lane notes and no unresolved blocker-level regression

## Recommended Next Technical Steps

1. Keep the Safari smoke checklist current for each release cycle.
2. Expand browser detection and debug payloads where Safari runtime differences need explicit capture.
3. Decide whether future scripts should exist:
   - `scripts/build-safari.mjs`
   - `scripts/package-safari.mjs`
4. Only add those scripts after the repo can produce a real Safari artifact rather than a placeholder.

Current recommendation:

- documentation + checklist + runtime detection prep is enough for now
- real `build-safari` / `package-safari` scripts should wait until the Xcode/App Store Connect path is chosen

Checklist:

- [safari-smoke-checklist.md](./safari-smoke-checklist.md)

## Official References

- Apple Safari Web Extensions overview: [developer.apple.com](https://developer.apple.com/documentation/safariservices/safari-web-extensions)
- Apple Safari extensions distribution overview: [developer.apple.com](https://developer.apple.com/safari/extensions/)
