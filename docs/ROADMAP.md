# Roadmap

Candidate features in no required order. Each entry links to its ADR for full context, design
reasoning, and consequences. To start a feature: ensure its ADR is Accepted, then build.

## Candidate Features

| Feature | Status | ADR | Notes |
|---|---|---|---|
| In-Memory Document Model | Proposed | [ADR-0003](adr/0003-in-memory-document-model.md) | Prerequisite for Inverse Fields |
| Bidirectional / Inverse Fields | Proposed | [ADR-0004](adr/0004-bidirectional-inverse-fields.md) | Depends on ADR-0003 |
| Project Themes | Proposed | [ADR-0001](adr/0001-project-themes.md) | — |
| Multi-Project Management | Proposed | [ADR-0002](adr/0002-multi-project-management.md) | — |
| Desktop Packaging & Distribution | Proposed | [ADR-0005](adr/0005-desktop-packaging-distribution.md) | Uses Electron and electron-builder |
| Encapsulate Folio Mutations | Proposed | [ADR-0006](adr/0006-encapsulate-folio-mutations.md) | Architectural prerequisite for ADR-0003 |
| Consolidate Folio Integrity Checking | Proposed | [ADR-0007](adr/0007-consolidate-folio-integrity.md) | Speculative cleanup of validation locality |
| YAML Frontmatter for Metadata | Accepted | [ADR-0008](adr/0008-yaml-frontmatter-metadata.md) | Breaking format change; replaces `## Meta` |

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
- [x] Route PUT rename through `fileIO.renameFolioFile` instead of a direct `node:fs/promises` `rename` (wires up the previously-dead export). Partial step toward [ADR-0006](adr/0006-encapsulate-folio-mutations.md); DELETE still calls `unlink` directly
- [x] Surface `createStub`/`createAndEdit` mutation failures in `FolioEditView` (were silently swallowed)
- [x] Memoize `Sidebar` `byType` grouping with `useMemo`
- [x] Add integration tests for the `config` and `schema` routes
- [x] Return real parse warnings from PUT/POST save responses (was hardcoded `[]`) via a serialize→parse round-trip
- [ ] Replace `ProjectStore` linear array scans (`.find`/`.filter`) with `Map` lookups — deferred to [ADR-0003](adr/0003-in-memory-document-model.md), the natural time to revisit the data structure
