# Firefox-family Smoke Checklist

Operational source of truth:

- [release-browser-program.md](./release-browser-program.md)

Use this checklist for:

- Firefox (reference target)
- LibreWolf
- Waterfox
- Floorp
- Zen

Artifact under test:

- `dist/packages/calmblock-firefox-v<version>.zip` (or unpacked `dist/firefox`)

Official Firefox-family certification uses this one artifact for:

- Firefox
- LibreWolf
- Waterfox
- Floorp
- Zen

Reference target:

- Firefox is the baseline for expected Firefox-family behavior.

## Per-browser Checks

For each browser above:

- [ ] extension install/load
- [ ] popup opens without layout break
- [ ] global toggle works
- [ ] site toggle works
- [ ] strict mode toggle works
- [ ] allowlist changes persist and apply correctly
- [ ] import/export works
- [ ] optional permissions behavior is clear and predictable
- [ ] live counters fallback state is clear when feedback permission/API is unavailable
- [ ] update behavior keeps baseline settings and core toggles functional

## Firefox-family Risk Capture

For each tested browser, note:

- [ ] browser version and channel context (stable / ESR-like)
- [ ] private browsing behavior observed
- [ ] optional permission differences observed
- [ ] DNR feedback/live-counter differences observed
- [ ] update-path differences observed
- [ ] fork-specific caveats for release notes

## Browser-specific Reminders

- [ ] Firefox: use as the reference result when comparing the rest of the family
- [ ] LibreWolf: document permission/private-mode differences caused by hardening defaults
- [ ] Waterfox: document any API/runtime differences tied to release cadence
- [ ] Floorp: document ESR/stable lag if behavior differs from Firefox stable
- [ ] Zen: document prompt or private-window UX differences if observed
