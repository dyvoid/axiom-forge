# 4. Bidirectional / Inverse Fields

**Date:** 2026-06-05  
**Status:** Proposed — depends on ADR-0003 (In-Memory Document Model)

## Context

`wikilink` and `wikilink-list` fields are strictly one-directional: the value is stored only in
the folio that declares it. If a Character has a `children` field pointing at another Character,
the target's `parent` field is not automatically populated. Users must set both sides manually.

The backlinks system gives a passive hint in the UI ("Alice is linked from Bob") but does not
write anything to disk — the `parent` field on the target remains empty unless explicitly edited.

This is a consistent friction point for any relational schema where relationships are naturally
symmetric or inverse: parent/child, spouse/spouse, member-of/has-members, ruler-of/ruled-by.

## Decision

Add an optional `inverse` property to `FieldDef` in `schema.json`. Its value is a
dot-separated path identifying the field on the target folio that should be kept in sync:
`"<SectionName>.<FieldName>"`.

When the server saves a folio that contains a `wikilink` or `wikilink-list` field with an
`inverse` annotation, it automatically patches the referenced folio(s): the source entry is
added to (or removed from) the inverse field on the target. The patch is committed to disk as
part of the same save operation, using the batched flush introduced by ADR-0003.

## Consequences

- `FieldDef` gains an optional `inverse: string` property. This is backward-compatible —
  existing `schema.json` files without `inverse` annotations are unaffected.
- Round-trip fidelity of the serializer is critical: a patched folio must be re-serialized
  without altering content the user or Obsidian authored in unrelated fields.
- Save operations on folios with inverse fields touch multiple files. The mtime conflict
  detection from ADR-0003 must cover all patched files, not only the primary saved folio.
- `docs/data-model.md` must be updated to document the `inverse` annotation and its semantics.
- This feature requires ADR-0003 to be fully implemented and Accepted before work begins.
