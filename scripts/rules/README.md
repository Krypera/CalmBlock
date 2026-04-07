# Rules Pipeline

CalmBlock rulesets are generated from source lists to keep builds reproducible.

## Source of truth

- `scripts/rules/sources.json`: group metadata and source file mapping
- `scripts/rules/sources/*.list`: one rule per line in this format:

```text
||example-tracker.com^ | script,xmlhttprequest,ping
```

## Generation

Run:

```bash
npm run rules:build
```

This generates:

- `public/rules/ads.json`
- `public/rules/trackers.json`
- `public/rules/annoyances.json`
- `public/rules/strict.json`
- `public/rules/metadata.json`

## Notes

- Duplicate source lines are removed deterministically.
- Rule IDs are stable per group using fixed `idBase` values from `sources.json`.
- `scripts/build.mjs` runs generation automatically before extension builds.
