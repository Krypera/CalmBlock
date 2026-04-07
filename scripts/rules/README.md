# Rules Pipeline

CalmBlock rulesets are generated from local source lists so releases stay reproducible and provenance can be audited.

## Source of truth

- `scripts/rules/sources.json`: rules program metadata, per-group provenance, fixtures, and source file mapping
- `scripts/rules/sources/*.list`: one rule per line in one of these formats:

```text
||example-tracker.com^ | script,xmlhttprequest,ping
||example-consent.com^ | script,xmlhttprequest | provenance=manual-curation; reason=cmp-endpoint; fixture=tests/content/fixtures/annoyance-consent.html
```

Supported annotation keys:

- `provenance`
- `reason`
- `fixture`
- `tags`

## Program model

The rules program is intentionally release-bound right now:

- rule updates ship with normal releases
- every group records `reviewedAt`
- every group records one or more provenance entries
- fixture links can be attached at group or per-rule level
- `public/rules/metadata.json` exposes enough context to review origin and change history without opening the source lists

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

## Validation

Builder validation fails fast for:

- empty filters
- invalid `resourceTypes`
- unsupported annotation keys
- duplicate rules with conflicting annotations
- duplicate rule IDs across all groups
- unsorted rule sources
- manifest groups missing provenance or review metadata

`scripts/build.mjs` runs generation automatically before extension builds.

## Metadata tracking

`public/rules/metadata.json` now includes:

- program-level release/provenance policy
- overall summary (`groupCount`, `totalRules`, `annotatedRules`)
- per-group `reviewedAt`, `fixtures`, and `provenance`
- per-group `annotationCoverage`
- `ruleCount`
- `idRange`
- `sourceDigest` (short SHA-256 digest of normalized source entries plus annotations)
- `changes` (`added`, `removed`, `delta`) compared with the previously generated output
