# 9. Consolidate Folio Validation Rules

**Date:** 2026-06-19
**Status:** Accepted

> **Note:** Split out of [ADR-0007](0007-consolidate-folio-integrity.md), which originally
> bundled this validation rule engine with a shared traversal walker. The walker remains in
> ADR-0007; this rule engine is tracked separately so it can be judged on its own merits.

## Context

Folio validation rules are fragmented and executed at different times with
different severities:

1. `parser.ts` checks `select`/`multiselect` options during parsing and emits
   **warnings** (read is lenient).
2. `schema.ts` (`validateAgainstSchema`) checks the same options against the
   schema during saves and emits **errors** (write is strict).

The same underlying rule ("is this value valid for this field?") is therefore
defined in two places. If the schema shape or validation logic changes, both
must be updated.

## Decision

Define a single source of truth for folio validation rules (shape checking,
option validation). The parser and the save handler both call this engine,
passing a parameter that determines severity (warning on read vs. error on
write).

## Consequences

- **Single source of truth:** changes to validation logic happen in one place.
- **Reduced duplication:** consolidates the rules currently split between
  `parser.ts` and `schema.ts`.
- **Narrower scope than it first appears.** `parser.ts` duplicates only two rule categories —
  `unknown-type`/`unknown-section`/`unknown-field` and `invalid-select-value` — as warnings.
  `schema.ts`'s `wrong-shape` check has no read-time counterpart at all; it is write-only and
  stays that way.

## The read/write split is deliberate — do not flatten it

Lenient read and strict write is a worth-keeping property: tolerate schema drift already on disk
(e.g. a select option removed from the schema after files were written with it), enforce
conformance strictly on anything the app itself writes. That split is not the duplication
problem. The duplication is only that the *rule definitions* for those two categories are
copy-pasted between the two files with a different severity hard-coded at each site. One engine
with severity passed as a parameter deduplicates the rule logic without flattening the two
severities.
