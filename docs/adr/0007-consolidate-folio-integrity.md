# 7. Shared Folio Walker

**Date:** 2026-06-05 (split 2026-06-19)
**Status:** Accepted — implemented 2026-07-12

> **Note:** This ADR originally bundled two decisions — a shared traversal
> *walker* and a unified validation *rule engine*. They were split on
> 2026-06-19 because they carry very different risk profiles: the walker is a
> clear de-duplication win, while the rule engine is a speculative abstraction.
> The validation rule engine now lives in
> [ADR-0009](0009-consolidate-folio-validation-rules.md).

## Context

The logic for walking a folio's sections and fields is duplicated across
modules. `wikilink.ts` (`extractAllLinks`) and `brokenLinks.ts`
(`collectBrokenLinks`) each implement the same recursive traversal over a
folio's sections, section-level values, and per-field values to find links.

This traversal is coupled to the *shape* of a folio. If the section/field
structure changes, every hand-written walker must be updated in lockstep —
and they can silently drift apart in the meantime.

## Decision

Create a single utility for walking a folio's sections and fields. Link
extraction, broken-link collection, and any future analysis passes (e.g.
field-level search or statistics) implement a visitor over this walker
instead of writing their own traversal loops.

## Consequences

- **Single source of truth for traversal:** changes to the folio shape only
  require updating one walker.
- **Reduced duplication:** consolidates the recursive walking logic shared by
  `extractAllLinks` and `collectBrokenLinks`.
- **Flexibility:** a standard walker makes it trivial to add new analysis
  passes as visitors.

## Implementation

`walkFolioLinks` lives in `packages/shared/src/folioWalker.ts`. `extractAllLinks`
(moved out of `wikilink.ts`) and `collectBrokenLinks` (`brokenLinks.ts`) are now
visitors over it — same traversal, same public API, no caller changes needed.
Covered by `folioWalker.test.ts`.
