# CalmBlock UI i18n Plan

Last reviewed: 2026-04-08

## Why now

Current product UI strings are hard-coded in English across popup, options, and debug surfaces.  
This creates copy drift risk and slows localization.

## Scope

Phase targets:

1. Popup (`src/popup/index.ts`)
2. Options (`src/options/index.ts`)
3. Debug (`src/debug/index.ts`)

Non-goals for first phase:

- Rule-list language heuristics (handled separately in content engines)
- External docs localization

## Proposed architecture

- Add a shared dictionary module (for example `src/shared/i18n.ts`).
- Use stable keys (example: `popup.status.loading`, `options.allowlist.saved`).
- Default locale: `en`.
- Future locale loading model:
  - static bundled dictionaries for shipped locales
  - lightweight runtime locale resolver from browser language
- Keep message formatting local-first (no remote translation fetches).

## Migration steps

1. Extract all user-facing strings from popup/options/debug into keyed dictionaries.
2. Add a tiny formatter helper (`t(key, vars?)`) with fallback to `en`.
3. Replace inline template literals with key-based calls.
4. Add tests for key coverage:
  - no missing key in default locale
  - no unknown key usage in code
5. Add one pilot locale (`tr`) to validate interpolation and length-sensitive UI.

## QA checklist

- Popup status/error/toggle hints render correctly in each locale.
- Options allowlist warnings and capacity messages stay readable on narrow widths.
- Debug actions and redaction labels remain clear and unambiguous.
- No mixed-language fallback on normal flows.

## Release gating recommendation

- Do not claim multilingual UI support until at least `en` + one additional locale are fully wired and tested.
- Track rollout in release notes with key-count progress per surface.
