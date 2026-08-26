# 20. Extract the Folio Index from ProjectStore

**Date:** 2026-08-26
**Status:** Proposed

## Context

[ADR-0006](0006-encapsulate-folio-mutations.md) moved every folio write behind `ProjectStore`
methods, and [ADR-0010](0010-multi-file-write-safety.md) added the plan/commit rename rewrite on
top. Both were right, and both grew the class: `projectStore.ts` is now 621 lines holding two
distinct jobs.

The first job is **mutation orchestration** — the write mutex, validation tiers, atomic disk I/O
via `fileIO`, the two-phase link rewrite, and the typed domain errors. That is genuinely
`ProjectStore`'s work.

The second job is **maintaining the in-memory index** — the record array, ID assignment, the
alphabetical sort, and lookups. That work has leaked into the public interface. Seven methods
exist only to serve it: `addFolioRecord`, `removeFolioRecord`, `renameFolioRecord`,
`updateFolioRecord`, `updateMtime`, `getAllFilePaths`, and `deriveSnippet`. None has a caller
outside `projectStore.ts`. `getRecord` has callers only in `projectStoreMutations.test.ts`.

So roughly a third of the class's public surface is implementation showing through, and each
method carries an invariant that survives only as a comment — "re-sort alphabetically",
"preserves `id` so wiki-links stay valid", "keep the index alphabetical so consumers (sidebar)
don't have to re-sort". The ID rule in particular is spread across three methods
(`buildFolioIndex` assigns, `addFolioRecord` increments, `renameFolioRecord` preserves) with no
single place that states it.

Meanwhile the class writes `this.folios.find((f) => f.folder === folder && f.name === name)`
inline five separate times instead of going through its own `getRecord`.

## Decision

Extract a `FolioIndex` module in `packages/server` that owns the record array and everything
about maintaining it: ID assignment and stability, alphabetical ordering, and the lookups
(`byKey`, `byType`, `byFilePath`, `backlinksTo`, `withWarnings`). Mutation methods become
`FolioIndex`'s interface — `add`, `remove`, `rename`, `update`, `touchMtime`.

`ProjectStore` keeps the mutex, validation, disk I/O, the ADR-0010 plan/commit sequence, and the
domain errors, and delegates index maintenance to `FolioIndex`. Its public surface drops to the
API-facing set: `load`, `reload`, `getConfig`, `getSchema`, `getFolios`, `getFoliosByType`,
`getBacklinks`, `getWarnings`, `search`, `getFolio`, `saveFolio`, `createFolio`, `deleteFolio`.

`deriveSnippet` moves with the index if it stays record-shaping, or to `shared` if
[ADR-0019](0019-schema-index.md) lands first and gives it `proseSection()` — decide at build
time, not here.

## Consequences

- **The ID contract gets one home.** "IDs are assigned alphabetically at boot and preserved
  across rename" becomes a property of one module with one test, instead of an emergent result
  of three methods agreeing.
- **`ProjectStore`'s interface stops describing its implementation.** Seven methods leave the
  public surface; the class reads as what it is, a write-safety layer.
- **Absorbs a Housekeeping item.** Replacing the linear `.find`/`.filter` scans with `Map`
  lookups was tracked separately in the [Roadmap](../ROADMAP.md). It becomes a change behind
  `FolioIndex`'s interface with no caller edits, so it is folded in here rather than tracked on
  its own.
- **Faster tests for index behaviour.** ID stability, sort order, and backlink resolution are
  pure in-memory properties. They move from tier-2 integration tests that build a real project
  in `tmpdir` to tier-1 unit tests, leaving the integration tests to cover what they are for —
  real disk I/O.
- **Cost: one indirection.** `ProjectStore` gains a field and delegates. This is a refactor with
  no behaviour change and no API change; the route layer does not move.
