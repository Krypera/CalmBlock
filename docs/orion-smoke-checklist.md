# Orion Smoke Checklist (Gated / Under Validation)

Operational source of truth:

- [release-browser-program.md](./release-browser-program.md)

Target browser:

- Orion

Canonical artifact:

- primary: `dist/packages/calmblock-chrome-v<version>.zip` (or unpacked `dist/chrome`)
- comparison when needed: `dist/packages/calmblock-firefox-v<version>.zip` (or unpacked `dist/firefox`)

This checklist is required before Orion can be treated as official support.

## Required Checks

- [ ] install/load
- [ ] service worker lifecycle is stable (startup, wake, message flow)
- [ ] DNR rulesets activate and remain enabled as expected
- [ ] popup messaging is clear and state-aware
- [ ] `tabs` and `storage` access works for core features
- [ ] content scripts apply safely (cosmetic + annoyance behavior)
- [ ] optional permission behavior is understandable and does not break core flow
- [ ] live counters fallback state is clear when feedback APIs are missing/limited

## Comparison And Compatibility Checks

- [ ] `chrome` artifact result recorded
- [ ] `firefox` artifact comparison recorded when needed
- [ ] Orion compatibility mode status recorded
- [ ] built-in blocker state recorded
- [ ] browser version recorded

## Known Risks To Watch

- WebExtensions API completeness can vary by Orion version.
- Browser maturity is still beta-level in practice for extension support.
- Compatibility mode can change extension behavior materially.
- Built-in blocker behavior can affect perceived blocking results.
- Version sensitivity should be assumed until two consecutive release passes are established.

## Gate Tracking

- [ ] release `N` passed
- [ ] release `N+1` passed

Only after two consecutive passes should Orion move from "gated / under validation" to "official."
