# Release Template

Use this template for the first tagged release (for example `v0.1.0-alpha`).

## CalmBlock {{version}}

### Highlights

- 

### Quality Checks

- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`

### Browser Support Verification

Program and worksheet:

- [ ] `docs/release-browser-program.md` still matches current support policy
- [ ] `docs/release-browser-matrix.md` updated for this release candidate

Official release-blocking families:

- [ ] Chromium family certified with `calmblock-chrome-v<version>.zip`
- [ ] Firefox family certified with `calmblock-firefox-v<version>.zip`

Chromium family browsers:

- [ ] Chrome
- [ ] Edge
- [ ] Brave
- [ ] Vivaldi
- [ ] Opera
- [ ] Arc
- [ ] Yandex

Firefox family browsers:

- [ ] Firefox (reference target)
- [ ] LibreWolf
- [ ] Waterfox
- [ ] Floorp
- [ ] Zen

Gated lanes:

- [ ] Orion gate reviewed:
  - [ ] `chrome` artifact result recorded
  - [ ] `firefox` comparison recorded if needed
  - [ ] compatibility mode recorded
  - [ ] built-in blocker state recorded
  - [ ] browser version recorded
  - [ ] consecutive-pass status updated
- [ ] Safari lane reviewed:
  - [ ] `docs/safari-support.md` reviewed
  - [ ] `docs/safari-smoke-checklist.md` reviewed
  - [ ] packaging path state updated
  - [ ] review/distribution state updated
  - [ ] blocker-level risks called out honestly

Issue triage scope checks:

- [ ] issue templates still classify reports as:
  - [ ] supported browser issue
  - [ ] gated / under validation browser issue
  - [ ] out-of-scope browser issue

For each verified browser, cover:

- [ ] install/load
- [ ] popup open
- [ ] global toggle
- [ ] site toggle
- [ ] allowlist
- [ ] strict mode
- [ ] import/export
- [ ] live counters fallback
- [ ] baseline behavior after extension update
- [ ] built-in blocker conflict reviewed (if browser has one)
- [ ] known-difference notes reviewed against `docs/release-browser-program.md`

### Privacy Guarantees (unchanged)

- no telemetry
- no analytics
- no remote code
- no account/cloud sync

### Known Limitations

- 

### Upgrade Notes

- 
