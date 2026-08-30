# 21. Section Kind as a Discriminated Union

**Date:** 2026-08-26
**Status:** Accepted — implemented 2026-08-30

## Context

A folio section takes one of three shapes, decided by its schema definition: free prose, a
section-level list of wiki-links, or a map of structured fields. `ParsedSection` in
`shared/types.ts` models all three as optional properties — `content?`, `value?`, `fields?` —
and states the rule in a doc comment: *"Exactly one of `content`, `value`, or `fields` will be
populated."*

The type does not enforce that, so every consumer re-derives the discrimination itself, and they
have already drifted on the case the rule says cannot happen — a section-level `type` that is
neither `textarea` nor `wikilink-list`:

- `parser.parseSectionLevelValue` falls back to `{ content: body }`
- `serializeToMarkdown` silently **drops the section**
- `FieldSection.tsx` (read) renders `<></>`
- `SectionBlock` in `FolioEditView.tsx` (edit) returns `<></>`

`SectionLevelTypeSchema` in `schema.ts` already restricts section-level `type` to those two
values, so all four branches are unreachable today. That is the problem: they are dead code
written four different ways, and the day a third section kind is added — [ADR-0016](0016-alternate-data-views.md)
is the obvious pressure — the serializer's branch turns from unreachable into a silent data
loss, with nothing failing to announce it.

Separately, the "is this field empty?" predicate exists in three copies with the same logic:
`isFieldValueEmpty` in `parser.ts` (not exported), and inline `.filter()` bodies in
`FieldSection.tsx` and `MetaSection.tsx`. The serializer decides what reaches disk with one copy
and the read view decides what renders with another. Nothing keeps them in step.

## Decision

Make the section kind explicit and exhaustive.

1. Narrow `SectionDefSchema`'s `type` from the full `FieldType` enum to `SectionLevelTypeSchema`,
   so `SectionDef['type']` is `'textarea' | 'wikilink-list' | undefined` at the type level. The
   restriction was already enforced at runtime by a `superRefine` check; moving it onto the field
   deletes that check and lets the compiler see it.
2. Add `classifySection(sectionDef)` to `shared/schema.ts`, returning a discriminated union:
   `{ kind: 'prose' } | { kind: 'links'; target } | { kind: 'fields'; fields }`.
3. Export `isFieldValueEmpty` from `shared` and delete the two inline copies.
4. Dispatch on `classifySection` at all four sites, each with a `never` exhaustiveness check in
   its default branch, so adding a fourth kind is a compile error at every site that must handle
   it rather than a silent drop at one.

The one shape `classifySection` cannot classify — a definition declaring neither `fields` nor
`type` — throws rather than returning a fourth union member. `SectionDefSchema` rejects it and
every schema reaching a consumer has been through `ProjectSchemaSchema.parse`, so it can only
arise from a caller constructing a `SectionDef` by hand. Making it a union member would put a
branch for an impossible case in all four consumers, which is the duplication this ADR removes.

This supersedes the Housekeeping entry that proposed `classifySection()` and the
`isFieldValueEmpty` export on their own. That version deduplicates the dispatch but leaves the
invariant unenforced, which means touching the same six files twice — once to consolidate, again
to make it exhaustive. Do it once.

## Consequences

- **The invariant moves from a comment into the compiler.** "Exactly one of these is populated"
  stops being a promise readers must keep and becomes a shape the type system checks.
- **Read and write cannot disagree about emptiness.** One predicate decides both what is written
  to disk and what is rendered, closing the drift that could otherwise omit a field from the file
  while the read view still shows it — or the reverse.
- **A new section kind fails loudly.** ADR-0016's table and board views, and any later
  section-level type, get a compile error listing every site that must handle them.
- **Four dispatch sites shrink to a switch each,** and the unreachable fallbacks are deleted
  rather than reworded.
- **Touches both packages.** `shared` gains the classifier, `server` and `client` both consume it
  — a cross-package refactor, which [AGENTS.md](../../AGENTS.md) flags for human review before it
  lands.
- **No on-disk format change.** The serializer's output is unchanged for every schema that is
  valid today; only the handling of shapes Zod already rejects moves from silent to loud.

## Implementation

`classifySection` and `ClassifiedSection` live in `shared/schema.ts`; `isFieldValueEmpty` is
exported from `shared/parser.ts`. The four dispatch sites are `parseMarkdown` and
`serializeToMarkdown` (both `shared/parser.ts`), `FieldSection.tsx`, and `SectionBlock` in
`FolioEditView.tsx`. `MetaSection.tsx` was not a dispatch site — it renders `role: 'meta'`
sections only — but held the third copy of the emptiness predicate and now uses the shared one.

Two deviations from the Decision as first written: the `links` member carries the section's
`target` (the edit view needs it to build the synthetic `FieldDef` it hands to `FieldEditor`),
and narrowing `SectionDefSchema` changed the wording of the error a malformed `schema.json`
produces for a bad section-level `type` — it now comes from the enum's own `errorMap` rather
than the deleted `superRefine` branch.
