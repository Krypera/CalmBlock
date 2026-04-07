# Safari Smoke Checklist (Gated / Under Validation)

Operational source of truth:

- [release-browser-program.md](./release-browser-program.md)

Target browser:

- Safari

Lane under review:

- Apple packaging and review lane
- not the current `chrome` or `firefox` zip artifacts

## Required Checks

- [ ] packaging path is identified for this release cycle
- [ ] install/load works in the current Safari lane
- [ ] popup opens and renders correctly
- [ ] global toggle works
- [ ] site toggle works
- [ ] rules activation state is visible and stable
- [ ] content scripts apply safely
- [ ] optional permission behavior is understandable
- [ ] live counters fallback is clear when feedback APIs are missing or limited
- [ ] update behavior preserves baseline settings and core toggles

## Lane Notes To Capture

- [ ] Safari version recorded
- [ ] macOS version recorded
- [ ] packaging path recorded
- [ ] review or signing blockers recorded
- [ ] service worker lifecycle caveats recorded
- [ ] permission or host-access caveats recorded

## Promotion Gate

Safari remains `Gated / under validation` until:

- a real Safari packaging path exists
- Apple distribution and review workflow is documented
- this checklist is used in at least two consecutive release cycles
- no blocker-level regression remains open at promotion time
