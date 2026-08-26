# Roadmap

Candidate features ordered by priority — what matters most to build, not just what's closest to
buildable. ADR status (Proposed/Accepted) tracks design maturity, which is a separate axis: a
high-priority item can still need scoping before it's ready to accept. Each entry links to its ADR
for full context, design reasoning, and consequences. To start a feature: ensure its ADR is
Accepted, then build.

## Candidate Features

| # | Feature | Status | ADR | Notes |
|---|---|---|---|---|
| 1 | Consolidate Folio Validation Rules | Accepted | [ADR-0009](adr/0009-consolidate-folio-validation-rules.md) | Not yet built; keeps read/write severity split, unifies rule logic. Quick win: self-contained, modest scope |
| 2 | Bidirectional / Inverse Fields | Accepted | [ADR-0004](adr/0004-bidirectional-inverse-fields.md) | Not yet built; display-first. Push prompt covers both add and remove; the 2 remaining open items (deletion, dangling targets) are decidable at build time, not user-blocked |
| 3 | Project Scaffolding / Schema Setup Wizard | Proposed — **needs scoping** | [ADR-0013](adr/0013-project-scaffolding.md) | Highest priority past the quick wins above. Pre-adoption blocker: no way to create a new project without hand-writing JSON schema. Skeleton ADR only — design not yet brainstormed, that's the next step, not a build |
| 4 | Alternate Data Views (Table, Board, Saved Filters, Graph) | Proposed | [ADR-0016](adr/0016-alternate-data-views.md) | Fully designed. No schema changes needed for the table/board/saved-filter slice; graph view (same ADR) costs more, build last within it |
| 5 | Structured Date Fields (Sort Key & Calendar Modes) | Proposed | [ADR-0015](adr/0015-structured-date-fields.md) | Fully designed. Adds `sortkey`/`calendar` modes to the `date` field type; keeps hand-editable flat YAML, no required nesting. Prerequisite for Timeline View |
| 6 | Folio Cover Image | Proposed | [ADR-0018](adr/0018-folio-cover-image.md) | Fully designed. Optional, co-located image per folio (Wikipedia-infobox style); needs new static-file serving, none exists today. Inline images deferred |
| 7 | Timeline View | Proposed | [ADR-0017](adr/0017-timeline-view.md) | Blocked on #5 (ADR-0015); lays out entries by sortable date value |
| 8 | Visibility / Access Control (field & entry level) | Proposed — **needs scoping** | [ADR-0014](adr/0014-visibility-access-control.md) | Recurring want across GM/novelist/publisher/creator use cases; may be capped by no-auth server architecture. Skeleton ADR only |
| 9 | Project Themes | Proposed | [ADR-0001](adr/0001-project-themes.md) | Persona-dependent, no strong consensus |
| 10 | Multi-Project Management | Proposed | [ADR-0002](adr/0002-multi-project-management.md) | Persona-dependent, no strong consensus |
| 11 | Markdown Source Edit Mode | Proposed | [ADR-0012](adr/0012-markdown-source-edit-mode.md) | Toggle between structured form editor and raw Markdown textarea; 4 open questions to settle before building |
| 12 | Desktop Packaging & Distribution | Proposed | [ADR-0005](adr/0005-desktop-packaging-distribution.md) | Uses Electron and electron-builder; value is platform-dependent per persona |

## Implemented / Resolved

Built already, or no longer applicable. Listed so every ADR is reachable from this index; not
part of the active sequence.

| Feature | Status | ADR | Notes |
|---|---|---|---|
| Multi-File Write Safety | Accepted | [ADR-0010](adr/0010-multi-file-write-safety.md) | Batched rename link-rewrite: all targets verified against indexed mtime before the first write; supersedes ADR-0003 |
| Unify Entry Cards & Ranking | Accepted | [ADR-0011](adr/0011-unify-entry-cards-and-ranking.md) | Shared `scoreFolio`/`rankFolios` + `EntryContent` (sidebar excluded) |
| Encapsulate Folio Mutations | Accepted | [ADR-0006](adr/0006-encapsulate-folio-mutations.md) | Unblocks ADR-0010 |
| Shared Folio Walker | Accepted | [ADR-0007](adr/0007-consolidate-folio-integrity.md) | De-dupes folio traversal (validation half split into ADR-0009) |
| YAML Frontmatter for Metadata | Accepted | [ADR-0008](adr/0008-yaml-frontmatter-metadata.md) | Breaking format change; replaces `## Meta` |
| In-Memory Document Model | Superseded | [ADR-0003](adr/0003-in-memory-document-model.md) | Never built; replaced by ADR-0010 (content cache declined) |

## Housekeeping

Agreed-upon cleanups that don't warrant an ADR. Remove an item once it lands — git log is the
record of what was done.

- [ ] Replace `ProjectStore` linear array scans (`.find`/`.filter`) with `Map` lookups. Independent
  and low priority: the scans are over tens of records
- [ ] Add `classifySection()` to `shared/schema.ts` and export `isFieldValueEmpty` from `shared` —
  section-kind dispatch (prose / links / fields) is currently re-derived independently in
  `FieldSection.tsx` (read) and `SectionBlock` in `FolioEditView.tsx` (edit), and the
  field-emptiness check is copy-pasted across `FieldSection.tsx`, `MetaSection.tsx`, and a third
  variant in `parser.ts`
