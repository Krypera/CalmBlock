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

- Source files must stay sorted by `filter | resourceTypes` to keep diffs predictable.
- Duplicate source lines are removed deterministically.
- Rule IDs are stable per group using fixed `idBase` values from `sources.json`.
- Builder validation fails fast for:
  - empty filters
  - invalid `resourceTypes`
  - duplicate rule IDs across all groups
  - unsorted rule sources
- `scripts/build.mjs` runs generation automatically before extension builds.

## Metadata tracking

`public/rules/metadata.json` includes per-group fields to track changes over time:

- `ruleCount`
- `idRange`
- `sourceDigest` (short SHA-256 digest of normalized source entries)
- `changes` (`added`, `removed`, `delta`) compared with the previously generated output
