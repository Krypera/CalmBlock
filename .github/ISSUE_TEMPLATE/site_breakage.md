---
name: Site breakage report
about: Report a website that breaks only when CalmBlock is active.
title: "[Breakage] "
labels: bug, site-breakage
assignees: ""
---

## Site

- URL or host:

## Scope Classification

- [ ] Supported browser issue
- [ ] Gated / under validation browser issue
- [ ] Out-of-scope browser issue

## Browser

- Browser:
- Browser version:
- CalmBlock version/commit:
- OS:
- Private/incognito mode: (No / Yes)
- Built-in blocker enabled?: (No / Yes / Not sure)
- Firefox family context (if applicable): (Firefox / LibreWolf / Waterfox / Floorp / Zen)
- Browser channel or base track (if known): (stable / ESR-like / unknown)
- Orion artifact tested (if applicable): (`chrome` / `firefox` / not tested)
- Orion compatibility mode (if applicable): (enabled / disabled / unknown)

## Reproduction

1.
2.
3.

## Expected vs Actual

- Expected:
- Actual:

## Validation

- [ ] Breakage disappears after pausing CalmBlock for this site and reloading.
- [ ] I tested with global protection on.
- [ ] I noted whether optional permission prompts behaved differently in this browser.
- [ ] I noted whether live counters were unavailable and fallback text was clear.
- [ ] I noted Orion compatibility mode and built-in blocker state if this report is from Orion.

## Debug Triage Bundle

From CalmBlock debug page (advanced mode), paste `triageBundle` exactly as produced.
Expected schema: `calmblock.triage.v1`.

```json
{
  "schema": "calmblock.triage.v1",
  "generatedAt": "2026-04-07T15:47:43.140Z",
  "browserTarget": "chrome",
  "extensionVersion": "0.1.1",
  "activeHost": "example.com",
  "globalEnabled": true,
  "groups": {
    "ads": true,
    "trackers": true,
    "annoyances": true,
    "strict": false
  },
  "allowlist": [],
  "enabledRulesets": ["ads", "trackers", "annoyances"],
  "dynamicRulesCount": 1
}
```

## Optional Attachments

- Screenshot/video
- Console/network notes
