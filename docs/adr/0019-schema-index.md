# 19. Schema Index

**Date:** 2026-08-26
**Status:** Proposed

## Context

`ProjectSchema` is passed around as the raw Zod-inferred shape — a `Record<string, TypeDef>`
keyed by type name. Every consumer that needs a fact *about* the schema derives it by scanning
that record, so the same two inverted lookups are re-implemented across both packages.

**Folder → type.** Nine call sites resolve a folder name back to its type key or `TypeDef`.
Eight of them are the same expression, `Object.entries(schema.types).find(([, def]) => def.folder
=== folder)`, differing only in whether they destructure `[typeKey]` or take `?.[1]`; a ninth
uses `Object.values(...).find(t => t.folder === f.folder)`. They live in `WikiLinkChip.tsx`,
`Sidebar.tsx`, `CategoryIndexView.tsx`, `GrandIndexView.tsx`, `WikilinkListField.tsx`,
`WikiLinkPicker.tsx`, `FolioEditView.tsx` (twice, twelve lines apart and byte-identical), and
`projectStore.createFolio`.

**Role → section.** `projectStore.deriveSnippet` finds the `role: "prose"` section with a
`.find()`; `FolioReadView` finds both the `prose` and `meta` sections with a hand-rolled `for`
loop over the same record. Two shapes, one question.

The rule that a folder maps to exactly one type is load-bearing — the on-disk layout depends on
it, and `[[Folder/Name]]` resolution is built on it — but it is stated nowhere. It is assumed
nine times. Each new folder-keyed fact costs another scan: [ADR-0016](0016-alternate-data-views.md)
needs folder → icon for its graph view, [ADR-0018](0018-folio-cover-image.md) needs folder →
image path, and [ADR-0004](0004-bidirectional-inverse-fields.md) needs the mapping in both
directions.

## Decision

Add a `createSchemaIndex(schema)` module to `packages/shared`. It takes a validated
`ProjectSchema` and returns a frozen object of pre-computed lookups:

- `typeKeyForFolder(folder)` / `typeDefForFolder(folder)`
- `folderForType(typeKey)`
- `proseSection(typeKey)` / `metaSection(typeKey)`
- `sectionsInOrder(typeKey)`

Build the index once per schema load: on the server in `ProjectStore.load()` and `reload()`,
on the client in `ProjectContext` next to the schema it already holds. Consumers read the schema
through the index rather than reaching into `schema.types` directly.

The index is a pure function of the schema — no I/O, no folio data, no React. It belongs beside
`schema.ts` in `shared` for the same reason parsing and ranking do: client and server must not
disagree about what the schema means.

## Consequences

- **One statement of the folder ↔ type bijection.** The rule moves from nine assumptions to one
  module that can validate it — a schema declaring two types on one folder becomes detectable
  rather than silently first-wins.
- **Nine call sites collapse to one line each,** and the `Object.entries(...).find(...)` idiom
  leaves the client entirely.
- **Testable in a tier that already exists.** `schema.test.ts` is tier-1 (pure, synthetic
  schemas, no mocking). Today this logic is only reachable through React components, which
  [Testing](../testing.md) deliberately does not cover; as an index it is unit-testable the day
  it lands.
- **Later folder-keyed facts extend the index** instead of adding a tenth scan.
- **Cost: one more object to thread.** The client gets it from `ProjectContext`, so no new
  plumbing there; the server holds it as a field alongside `schema`.
- **Not a performance change.** The scans are over a handful of types. This is about locality,
  not speed — do not justify it as an optimisation.
