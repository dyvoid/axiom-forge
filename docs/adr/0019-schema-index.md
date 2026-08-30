# 19. Schema Index

**Date:** 2026-08-26
**Status:** Proposed

## Context

`ProjectSchema` is passed around as the raw Zod-inferred shape — a `Record<string, TypeDef>`
keyed by type name. Every consumer that needs a fact *about* the schema derives it by scanning
that record, so the same two inverted lookups are re-implemented across both packages.

**Folder → type.** Ten call sites resolve a folder name back to its type key or `TypeDef`.
Eight of them are the same expression, `Object.entries(schema.types).find(([, def]) => def.folder
=== folder)`, differing only in whether they destructure `[typeKey]` or take `?.[1]`; a ninth
uses `Object.values(...).find(t => t.folder === f.folder)`. They live in `WikiLinkChip.tsx`,
`Sidebar.tsx`, `CategoryIndexView.tsx`, `GrandIndexView.tsx`, `WikilinkListField.tsx`,
`WikiLinkPicker.tsx`, `FolioEditView.tsx` (twice, twelve lines apart and byte-identical), and
`projectStore.createFolio`.

The tenth is the interesting one. `Sidebar.tsx`'s category-navigation handler asks the same
question through the record instead of a scan — `typeKeys.findIndex(k => schema.types[k].folder
=== routeFolder)`, then `schema.types[typeKeys[nextIndex]].folder` — and both indexings are
currently type errors under the project's strictness (`schema.types[k]` is possibly `undefined`).
They are two of the standing errors in `packages/client`. A lookup that returns a defined value
retires them rather than requiring a non-null assertion at each site.

**Role → section.** `projectStore.deriveSnippet` finds the `role: "prose"` section with a
`.find()`; `FolioReadView` finds both the `prose` and `meta` sections with a hand-rolled `for`
loop over the same record. Two shapes, one question.

The rule that a folder maps to exactly one type is load-bearing — the on-disk layout depends on
it, and `[[Folder/Name]]` resolution is built on it — but it is stated nowhere. It is assumed
ten times. Each new folder-keyed fact costs another scan:
[ADR-0016](0016-alternate-data-views.md) needs folder → icon for its graph view, and
[ADR-0018](0018-folio-cover-image.md) needs folder → image path.

[ADR-0004](0004-bidirectional-inverse-fields.md) is the strongest case, and it is more than
another scan. Its schema-load validation requires that an `inverse` path resolve to a field
existing on *every* type the annotated field can target — and `target` names folders, not types
(`Human.Allies` targets `Humans` and `Gods`). Checking one annotation therefore means resolving
folder → type once per target, at schema load, which is exactly where this index is built and
exactly where a wrong answer means accepting an unsatisfiable annotation instead of reporting it.

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

It lands next to `classifySection` ([ADR-0021](0021-section-kind-union.md)), which answers the
same category of question — *what does this schema mean?* — for one section. `sectionsInOrder`
is the obvious place to return sections already classified, so consumers make one call rather
than two; settle that at build time.

## Consequences

- **One statement of the folder ↔ type bijection.** The rule moves from ten assumptions to one
  module that can validate it — a schema declaring two types on one folder becomes detectable
  rather than silently first-wins.
- **Ten call sites collapse to one line each,** and the `Object.entries(...).find(...)` idiom
  leaves the client entirely. Two standing `packages/client` type errors go with it.
- **Testable in a tier that already exists.** `schema.test.ts` is tier-1 (pure, synthetic
  schemas, no mocking). Today this logic is only reachable through React components, which
  [Testing](../testing.md) deliberately does not cover; as an index it is unit-testable the day
  it lands.
- **Later folder-keyed facts extend the index** instead of adding an eleventh scan.
- **Cost: one more object to thread.** The client gets it from `ProjectContext`, so no new
  plumbing there; the server holds it as a field alongside `schema`.
- **Not a performance change.** The scans are over a handful of types. This is about locality,
  not speed — do not justify it as an optimisation.
