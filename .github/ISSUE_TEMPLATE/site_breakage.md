---
name: Site breakage report
about: Report a website that breaks only when CalmBlock is active.
title: "[Breakage] "
labels: bug, site-breakage
assignees: ""
---

## Site

- URL or host:

## Browser

- Browser: (Chrome / Edge / Firefox)
- Browser version:
- CalmBlock version/commit:

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
