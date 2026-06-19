# 9. Consolidate Folio Validation Rules

**Date:** 2026-06-19
**Status:** Proposed

> **Note:** Split out of [ADR-0007](0007-consolidate-folio-integrity.md), which
> originally bundled this validation rule engine with a shared traversal walker.
> The walker is a clear win and remains in ADR-0007; this rule engine is more
> speculative and is tracked separately so it can be accepted, deferred, or
> rejected on its own merits.

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
- **Risk — possible over-abstraction:** unifying the severity models may add
  unnecessary indirection *if* the read-lenience / write-strictness split was a
  deliberate design choice rather than incidental duplication. This is the open
  question that must be resolved before this ADR is accepted. The lower-risk
  half of the original ADR-0007 (the walker) does not depend on resolving it.
