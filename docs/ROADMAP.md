# Roadmap

Candidate features in no required order. Each entry links to its ADR for full context, design
reasoning, and consequences. To start a feature: ensure its ADR is Accepted, then build.

## Candidate Features

| Feature | Status | ADR | Notes |
|---|---|---|---|
| In-Memory Document Model | Superseded | [ADR-0003](adr/0003-in-memory-document-model.md) | Never built; replaced by ADR-0010 (content cache declined) |
| Multi-File Write Safety | Proposed | [ADR-0010](adr/0010-multi-file-write-safety.md) | Closes the unguarded rename link-rewrite; supersedes ADR-0003 |
| Bidirectional / Inverse Fields | Proposed | [ADR-0004](adr/0004-bidirectional-inverse-fields.md) | Revised 2026-07-30 to display-first; no longer depends on ADR-0003 |
| Project Themes | Proposed | [ADR-0001](adr/0001-project-themes.md) | — |
| Multi-Project Management | Proposed | [ADR-0002](adr/0002-multi-project-management.md) | — |
| Desktop Packaging & Distribution | Proposed | [ADR-0005](adr/0005-desktop-packaging-distribution.md) | Uses Electron and electron-builder |
| Encapsulate Folio Mutations | Accepted | [ADR-0006](adr/0006-encapsulate-folio-mutations.md) | Implemented 2026-06-19; unblocks ADR-0010 |
| Shared Folio Walker | Accepted | [ADR-0007](adr/0007-consolidate-folio-integrity.md) | Implemented 2026-07-12; de-dupes folio traversal (split from old 0007) |
| YAML Frontmatter for Metadata | Accepted | [ADR-0008](adr/0008-yaml-frontmatter-metadata.md) | Breaking format change; replaces `## Meta` |
| Consolidate Folio Validation Rules | Accepted | [ADR-0009](adr/0009-consolidate-folio-validation-rules.md) | Not yet built; keeps read/write severity split, unifies rule logic (split from old 0007) |

## Completed

The core feature set shipped in the initial build:

- Read and edit views for all entry types
- Live search with scoring
- Tag filtering
- Backlinks panel ("Linked Mentions")
- Broken-link detection on save
- Project-wide wikilink rewriting on entry rename

## Housekeeping

Agreed-upon cleanups that don't warrant an ADR. Check them off when done.

- [x] Move search ranking logic from `routes/index.ts` inline handler into `ProjectStore.search()` — makes it testable without HTTP and reusable by future CLI tools
- [x] Deduplicate the `isWikiLink` type guard — export it from `wikilink.ts`, reuse in `brokenLinks.ts`
- [x] Route PUT rename through `fileIO.renameFolioFile` instead of a direct `node:fs/promises` `rename` (wires up the previously-dead export). Superseded by [ADR-0006](adr/0006-encapsulate-folio-mutations.md), which moved all mutations (incl. DELETE's `unlink`) into `ProjectStore` behind the `fileIO` seam
- [x] Surface `createStub`/`createAndEdit` mutation failures in `FolioEditView` (were silently swallowed)
- [x] Memoize `Sidebar` `byType` grouping with `useMemo`
- [x] Add integration tests for the `config` and `schema` routes
- [x] Return real parse warnings from PUT/POST save responses (was hardcoded `[]`) via a serialize→parse round-trip
- [ ] Replace `ProjectStore` linear array scans (`.find`/`.filter`) with `Map` lookups — was parked pending ADR-0003; unparked by [ADR-0010](adr/0010-multi-file-write-safety.md), which declines the document-model rewrite. Independent and low priority: the scans are over tens of records
