# Chromium Smoke Checklist

Operational source of truth:

- [release-browser-program.md](./release-browser-program.md)

Use this checklist for official Chromium browsers:

- Chrome
- Edge
- Brave
- Vivaldi
- Opera
- Arc
- Yandex

Artifact under test:

- `dist/packages/calmblock-chrome-v<version>.zip` (or unpacked `dist/chrome`)

Official Chromium certification uses this one artifact for:

- Chrome
- Edge
- Brave
- Vivaldi
- Opera
- Arc
- Yandex

## Per-browser Checks

For each browser above:

- [ ] extension install/load
- [ ] permissions prompt/permissions state behaves as expected
- [ ] popup opens without layout break
- [ ] global toggle works
- [ ] site toggle works
- [ ] strict mode toggle works
- [ ] allowlist behavior remains stable
- [ ] live counters fallback state is clear when optional feedback permission is missing/denied
- [ ] update behavior keeps baseline settings and core toggles functional

## Test Hygiene Notes

- [ ] built-in blocker is disabled during validation (if present)
- [ ] private/incognito mode behavior is noted in release notes if it differs
- [ ] any browser-specific caveat is documented in README or release notes

## Browser-specific Reminders

- [ ] Brave: Shields disabled during validation
- [ ] Vivaldi: Tracker and Ad Blocking disabled during validation
- [ ] Opera: built-in ad blocker disabled during validation
- [ ] Arc: permissions/popup behavior checked against its own UI flow
- [ ] Yandex: built-in filtering/policy behavior checked and documented if different
