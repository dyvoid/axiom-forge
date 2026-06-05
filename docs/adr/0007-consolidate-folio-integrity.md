# 7. Consolidate Folio Integrity Checking

**Date:** 2026-06-05  
**Status:** Proposed

## Context

Folio validation and link extraction logic is currently fragmented across multiple modules and executed at different times:
1. `parser.ts` checks select/multiselect options during parsing and emits warnings.
2. `schema.ts` checks the same options against the schema during saves and emits errors.
3. `wikilink.ts` (`extractAllLinks`) and `brokenLinks.ts` (`collectBrokenLinks`) duplicate the same recursive walking logic over folio sections to find links.

This creates a scenario where validation rules (e.g. "is this value valid for this field?") and traversal rules (e.g. "how do we visit all links in a folio?") are defined in multiple places. If the schema shape changes, multiple walkers must be updated.

## Decision

Extract a shared folio validation and traversal engine.

1. **Shared Rule Engine:** Define a single source of truth for validation rules (e.g., shape checking, option validation). The parser and the save-handler will both call this engine, but pass a parameter to determine severity (warning vs. error).
2. **Shared Walker:** Create a single utility for walking a folio's sections and fields. Link extraction, broken link collection, and any future features (e.g., field-level search or statistics) will implement a visitor pattern over this walker instead of writing custom traversal loops.

## Consequences

- **Single Source of Truth:** Changes to the schema structure or validation logic only require updates in one place.
- **Reduced Code Duplication:** Consolidates duplicated logic across parser/schema and wikilink/brokenLinks.
- **Flexibility:** A standard folio walker makes it trivial to add new analysis passes in the future.
- **Risk:** Unifying the severity models (warning on read, error on write) might add unnecessary abstraction if the intentional design was to keep read-lenience completely decoupled from write-strictness.
