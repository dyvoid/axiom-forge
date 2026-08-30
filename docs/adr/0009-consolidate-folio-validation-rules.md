# 9. Consolidate Folio Validation Rules

**Date:** 2026-06-19
**Status:** Accepted — implemented 2026-08-30

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

## Implementation

`validateAgainstSchema(folio, schema, mode)` in `shared/schema.ts` is the engine. `parseMarkdown`
calls it with `'read'` and flattens the issues into its `warnings` string array;
`ProjectStore.validateForWrite` calls it with `'write'` and throws on any issue. Each issue now
carries a `severity` (`'warning'` | `'error'`) alongside its existing `path` and `code`.

Three things came out differently from the Decision as written:

- **`wrong-shape` is skipped on read rather than downgraded to a warning.** The ADR called it
  write-only; in practice that means the rule does not run at all in `read` mode. A file on disk
  has already been coerced into shape by the parser, so the check has nothing to say there.
- **Option checking narrowed to `select`/`multiselect`.** The parser previously checked options on
  *any* field declaring them, including types where options are meaningless. The save path never
  did. They now agree on the save path's behavior, which is the point of the consolidation.
- **A file with an empty `type` is not validated at all.** This matches what the parser already
  did — its unknown-type warning was guarded on a non-empty type — and is now stated rather than
  implied. `ParsedFolioSchema` requires a non-empty type, so the write path cannot reach it.
- **Prose sections no longer have their `value` shape-checked on write.** The old dispatch
  branched on `sectionDef.type` and so ran the `textarea` string check against `section.value`
  for prose sections; a save payload carrying `{ content: "x", value: 123 }` was rejected and now
  passes, with the stray `value` dropped at serialize time as it always was. `content` is still
  typed by `ParsedSectionSchema`, and `value` is not part of a prose section's shape, so checking
  it there was incidental to the untyped dispatch rather than a rule anyone chose. This is a real
  loosening of the strict-write guarantee, small and reachable only by a hand-made API call.
  Closing it properly means a new rule — *a prose section may not carry a `value` at all* — which
  is a decision of its own rather than part of this consolidation.

Read-path warning wording changed, since both paths now emit the engine's messages. The messages
gained the section name for field-level issues, so no read warning lost context in the move.
