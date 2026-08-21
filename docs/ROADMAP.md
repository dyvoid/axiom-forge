# Roadmap

Candidate features ordered by priority — what matters most to build, not just what's closest to
buildable. ADR status (Proposed/Accepted) tracks design maturity, which is a separate axis: a
high-priority item can still need scoping before it's ready to accept. Each entry links to its ADR
for full context, design reasoning, and consequences. To start a feature: ensure its ADR is
Accepted, then build.

## Candidate Features

| # | Feature | Status | ADR | Notes |
|---|---|---|---|---|
| 1 | Multi-File Write Safety | Accepted | [ADR-0010](adr/0010-multi-file-write-safety.md) | Not yet built; closes the unguarded rename link-rewrite; supersedes ADR-0003. Quick win: live data-loss path, no open design questions |
| 2 | Consolidate Folio Validation Rules | Accepted | [ADR-0009](adr/0009-consolidate-folio-validation-rules.md) | Not yet built; keeps read/write severity split, unifies rule logic. Quick win: self-contained, modest scope |
| 3 | Bidirectional / Inverse Fields | Accepted | [ADR-0004](adr/0004-bidirectional-inverse-fields.md) | Not yet built; display-first (revised 2026-07-30). Push-prompt scope resolved 2026-08-21 (covers both add and remove); 2 remaining open items (deletion, dangling targets) are decidable at build time, no longer user-blocked |
| 4 | Project Scaffolding / Schema Setup Wizard | Proposed — **needs scoping** | [ADR-0013](adr/0013-project-scaffolding.md) | Highest priority past the quick wins above. Pre-adoption blocker: no way to create a new project without hand-writing JSON schema. Skeleton ADR only — design not yet brainstormed, that's the next step, not a build |
| 5 | Alternate Data Views (Table, Board, Saved Filters, Graph) | Proposed | [ADR-0016](adr/0016-alternate-data-views.md) | Fully designed. No schema changes needed for the table/board/saved-filter slice; graph view (same ADR) costs more, build last within it |
| 6 | Structured Date Fields (Sort Key & Calendar Modes) | Proposed | [ADR-0015](adr/0015-structured-date-fields.md) | Fully designed. Adds `sortkey`/`calendar` modes to the `date` field type; keeps hand-editable flat YAML, no required nesting. Prerequisite for Timeline View |
| 7 | Folio Cover Image | Proposed | [ADR-0018](adr/0018-folio-cover-image.md) | Fully designed. Optional, co-located image per folio (Wikipedia-infobox style); needs new static-file serving, none exists today. Inline images deferred |
| 8 | Timeline View | Proposed | [ADR-0017](adr/0017-timeline-view.md) | Blocked on #6 (ADR-0015); lays out entries by sortable date value |
| 9 | Visibility / Access Control (field & entry level) | Proposed — **needs scoping** | [ADR-0014](adr/0014-visibility-access-control.md) | Recurring want across GM/novelist/publisher/creator use cases; may be capped by no-auth server architecture. Skeleton ADR only |
| 10 | Project Themes | Proposed | [ADR-0001](adr/0001-project-themes.md) | Persona-dependent, no strong consensus |
| 11 | Multi-Project Management | Proposed | [ADR-0002](adr/0002-multi-project-management.md) | Persona-dependent, no strong consensus |
| 12 | Markdown Source Edit Mode | Proposed | [ADR-0012](adr/0012-markdown-source-edit-mode.md) | Toggle between structured form editor and raw Markdown textarea; 4 open questions to settle before building |
| 13 | Desktop Packaging & Distribution | Proposed | [ADR-0005](adr/0005-desktop-packaging-distribution.md) | Uses Electron and electron-builder; value is platform-dependent per persona |

## Implemented / Resolved

Built already, or no longer applicable — kept for ADR history, not part of the active sequence.

| Feature | Status | ADR | Notes |
|---|---|---|---|
| Unify Entry Cards & Ranking | Accepted | [ADR-0011](adr/0011-unify-entry-cards-and-ranking.md) | Implemented 2026-07-30; shared `scoreFolio`/`rankFolios` + `EntryContent` (sidebar excluded) |
| Encapsulate Folio Mutations | Accepted | [ADR-0006](adr/0006-encapsulate-folio-mutations.md) | Implemented 2026-06-19; unblocks ADR-0010 |
| Shared Folio Walker | Accepted | [ADR-0007](adr/0007-consolidate-folio-integrity.md) | Implemented 2026-07-12; de-dupes folio traversal (split from old 0007) |
| YAML Frontmatter for Metadata | Accepted | [ADR-0008](adr/0008-yaml-frontmatter-metadata.md) | Breaking format change; replaces `## Meta` |
| In-Memory Document Model | Superseded | [ADR-0003](adr/0003-in-memory-document-model.md) | Never built; replaced by ADR-0010 (content cache declined) |

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
- [x] Responsive breakpoints — drawer sidebar below 900px, stacked folio columns below 1100px, compact header below 600px, fluid display type via `clamp()`, touch targets under `pointer: coarse`
- [x] Tokenize edit-view hardcoded values — added `--fs-control` (14px) and `--fs-button` (12px) to the type ramp; routed all hardcoded font sizes, letter-spacing, and off-grid spacing through tokens
- [x] Accessibility hardening — skip-to-main link, dialog focus traps + ARIA, combobox ARIA on search/select/picker, form labels on all edit fields, icon-only button aria-labels, dead wikilink chip focusable, `prefers-reduced-motion` (WebGL + global CSS), `--accent-gold-text` for AA contrast
- [x] Performance — replaced `backdrop-filter: blur(6px)` on edit toolbar with opaque background; memoized folio lookup map for O(1) wikilink chip resolution
- [x] Route unsaved-changes guard through `ConfirmDialog` — replaces native `window.confirm` with the app's own dialog
- [x] Italic cleanup — removed italic from action labels and structural elements per the italic-is-secondary rule; landing hero italic kept as editorial register
- [x] WebGL smoke bolder — darker plumes, faster drift, center safe-zone, and colophon-style footer; legibility preserved with 92% opaque footer and lighter smoke color
- [x] Folio breadcrumbs — `Index → Type → Folio` on read view, `Index → Type` on category index, `aria-current` on sidebar
- [x] Edit toolbar polish — eyebrow-sized buttons with thin soft border and 2px radius, outline-style Save, touch targets, tokenized stub button
- [x] Dialog token cleanup — hardcoded 12px/11px and fixed padding in `SchemaWarningsDialog` and `ConfirmDialog` routed through tokens
- [ ] Replace `ProjectStore` linear array scans (`.find`/`.filter`) with `Map` lookups — was parked pending ADR-0003; unparked by [ADR-0010](adr/0010-multi-file-write-safety.md), which declines the document-model rewrite. Independent and low priority: the scans are over tens of records
- [x] Loading/Error state immersion — replaced inline unstyled loading/error text with themed FolioSkeleton and FolioEmptyState in FolioRead.tsx
