# Roadmap

Candidate features ordered by priority — what matters most to build, not just what's closest to
buildable. ADR status (Proposed/Accepted) tracks design maturity, which is a separate axis: a
high-priority item can still need scoping before it's ready to accept. Each entry links to its ADR
for full context, design reasoning, and consequences. To start a feature: ensure its ADR is
Accepted, then build.

Internal refactors are tracked separately under [Architecture Candidates](#architecture-candidates)
— they compete for time with features but not on the same axis, so mixing them into one priority
order would misrepresent both.

**ADR-0013 owns the onboarding surface** (decided 2026-08-30). ADR-0002, ADR-0005 and ADR-0013
each specified a different mechanism for the same "how does a user get into a project" surface,
and ADR-0014 depended on it. ADR-0013 now leads: its design settles the shape, and the others
adopt it rather than re-specify. ADR-0002 keeps project *switching*, config editing and removal;
ADR-0005 contributes the Electron native dialog as one implementation. See
[ADR-0013](adr/0013-project-scaffolding.md#scope-this-adr-owns-the-onboarding-surface).

## Candidate Features

| # | Feature | Status | ADR | Notes |
|---|---|---|---|---|
| 1 | Bidirectional / Inverse Fields | Accepted | [ADR-0004](adr/0004-bidirectional-inverse-fields.md) | Not yet built; display-first. Push prompt covers both add and remove; the 2 remaining open items (deletion, dangling targets) are decidable at build time, not user-blocked |
| 2 | Project Scaffolding / Schema Setup Wizard | Proposed — **needs scoping** | [ADR-0013](adr/0013-project-scaffolding.md) | Pre-adoption blocker: no way to create a new project without hand-writing JSON schema. Skeleton ADR only — design not yet brainstormed, that's the next step, not a build |
| 3 | Alternate Data Views (Table, Board, Saved Filters, Graph) | Proposed | [ADR-0016](adr/0016-alternate-data-views.md) | Fully designed. No schema changes needed for the table/board/saved-filter slice; graph view (same ADR) costs more, build last within it |
| 4 | Structured Date Fields (Sort Key & Calendar Modes) | Proposed | [ADR-0015](adr/0015-structured-date-fields.md) | Fully designed. Adds `sortkey`/`calendar` modes to the `date` field type; keeps hand-editable flat YAML, no required nesting. Prerequisite for Timeline View |
| 5 | Folio Cover Image | Proposed | [ADR-0018](adr/0018-folio-cover-image.md) | Fully designed. Optional, co-located image per folio (Wikipedia-infobox style); needs new static-file serving, none exists today. Inline images deferred |
| 6 | Timeline View | Proposed | [ADR-0017](adr/0017-timeline-view.md) | Blocked on #4 (ADR-0015); lays out entries by sortable date value |
| 7 | Visibility / Access Control (field & entry level) | Proposed — **needs scoping** | [ADR-0014](adr/0014-visibility-access-control.md) | Recurring want across GM/novelist/publisher/creator use cases. Skeleton ADR only, and its own Consequences concede the no-auth deployment model may cap how far it can go. **Reviewed 2026-08-30 and kept** at full scope; narrowing to display-only remains available when it is scoped |
| 8 | Project Themes | Proposed | [ADR-0001](adr/0001-project-themes.md) | Persona-dependent, no strong consensus. In tension with the design system: AGENTS.md treats the print aesthetic as load-bearing, and there is no dark mode or `prefers-color-scheme` handling to build on. **Reviewed 2026-08-30 and kept** — the objection stands but is not grounds to close it |
| 9 | Multi-Project Management | Proposed | [ADR-0002](adr/0002-multi-project-management.md) | Persona-dependent, no strong consensus |
| 10 | Markdown Source Edit Mode | Proposed | [ADR-0012](adr/0012-markdown-source-edit-mode.md) | Toggle between structured form editor and raw Markdown textarea. 2 of its 4 open questions are now settled by ADR-0009. **Rank reviewed and held 2026-08-30** knowing it is the only in-app repair for a schema-drifted file, which is otherwise readable but unsaveable — that gap is [accepted for now](data-model.md#a-drifted-file-is-readable-but-not-saveable) |
| 11 | Desktop Packaging & Distribution | Proposed | [ADR-0005](adr/0005-desktop-packaging-distribution.md) | Uses Electron and electron-builder; value is platform-dependent per persona |

## Architecture Candidates

Internal quality work: no user-visible feature, but each one lowers the cost of the features
above. Same status axis as the table above — `Proposed` means the design is recorded, not agreed.

These two were resolved separately on 2026-08-30. A1 is Accepted and is the next build, as
ADR-0004's prerequisite. A2 stays Proposed and is revisited after ADR-0013, which reshapes the
same `load`/`reload` surface it would reorganize. Each ADR carries the reasoning.

| # | Change | Status | ADR | Notes |
|---|---|---|---|---|
| A1 | Schema Index | Accepted | [ADR-0019](adr/0019-schema-index.md) | Folder → type and role → section lookups are re-derived at 10 call sites across both packages, 2 of them standing type errors. Effectively a prerequisite for #1: ADR-0004's schema-load validation must resolve `target` folders to types to check an `inverse` path |
| A2 | Extract the Folio Index from ProjectStore | Proposed — deferred | [ADR-0020](adr/0020-folio-index-module.md) | 7 public `ProjectStore` methods exist only to maintain the in-memory array and have no external callers. Absorbs the former `Map`-lookup housekeeping item. Nothing waits on it and no failure mode behind it; sequence it *after* ADR-0013, which reshapes the same `load`/`reload` surface |

## Implemented / Resolved

Built already, or no longer applicable. Listed so every ADR is reachable from this index; not
part of the active sequence.

| Feature | Status | ADR | Notes |
|---|---|---|---|
| Consolidate Folio Validation Rules | Accepted | [ADR-0009](adr/0009-consolidate-folio-validation-rules.md) | One `validateAgainstSchema` engine; `mode` selects severity, read stays lenient |
| Section Kind as a Discriminated Union | Accepted | [ADR-0021](adr/0021-section-kind-union.md) | `classifySection` + shared `isFieldValueEmpty`; section-level `type` narrowed at the type level |
| Multi-File Write Safety | Accepted | [ADR-0010](adr/0010-multi-file-write-safety.md) | Batched rename link-rewrite: all targets verified against indexed mtime before the first write; supersedes ADR-0003 |
| Unify Entry Cards & Ranking | Accepted | [ADR-0011](adr/0011-unify-entry-cards-and-ranking.md) | Shared `scoreFolio`/`rankFolios` + `EntryContent` (sidebar excluded) |
| Encapsulate Folio Mutations | Accepted | [ADR-0006](adr/0006-encapsulate-folio-mutations.md) | Unblocks ADR-0010 |
| Shared Folio Walker | Accepted | [ADR-0007](adr/0007-consolidate-folio-integrity.md) | De-dupes folio traversal (validation half split into ADR-0009) |
| YAML Frontmatter for Metadata | Accepted | [ADR-0008](adr/0008-yaml-frontmatter-metadata.md) | Breaking format change; replaces `## Meta` |
| In-Memory Document Model | Superseded | [ADR-0003](adr/0003-in-memory-document-model.md) | Never built; replaced by ADR-0010 (content cache declined) |

## Housekeeping

Agreed-upon cleanups that don't warrant an ADR. Remove an item once it lands — git log is the
record of what was done.

- [ ] Extract index filtering from `GrandIndexView.tsx` and `CategoryIndexView.tsx` into a pure
  `filterFolios({ folios, query, tags, order })` helper plus a `useTagFilterParams()` hook for the
  `?tags=` round-trip. The two views apply tag filtering and ranking in different orders, and
  neither order is tested because the logic sits inside components. Extracting it moves the logic
  into the tier `packages/client` already tests. Leave the duplicated filter-bar markup alone
  until ADR-0016 makes it a third caller
