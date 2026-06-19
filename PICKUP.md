# PICKUP

Where the last session left off. Update this when you stop, so the next session starts with context
instead of archaeology. For the feature backlog, see [docs/ROADMAP.md](docs/ROADMAP.md).

## Current Focus

**Tech-debt batch** — a maintenance pass from an external audit, **complete and merged to `main`**
(commits `f247e6a`, `6c15cbf`, `96490ae`). `main` is ahead of `origin/main` by these 3 commits
and **not yet pushed**. The `fix/tech-debt-batch-1` branch is already deleted.

### What is done (this session)
- **#1** `isWikiLink` deduplicated — exported from `wikilink.ts`, reused in `brokenLinks.ts`.
- **#3/#7** PUT rename now routes through `fileIO.renameFolioFile` (was a direct `node:fs/promises`
  `rename`); the previously-dead `renameFolioFile` export is now wired up. This is the interim
  step toward ADR-0006 (still *Proposed* — mutations not yet moved into `ProjectStore`).
- **#4** `createStub`/`createAndEdit` failures now surface via a "Create failed" banner in
  `FolioEditView` (were silently swallowed).
- **#8** `Sidebar` `byType` grouping memoized with `useMemo`.
- **#5** Integration tests added for `GET /api/config` and `GET /api/schema`.
- **#6** PUT/POST save responses now return *real* parse warnings (was hardcoded `[]`) via a
  serialize→parse round-trip (no extra disk read), also stored on the index record so
  `GET /api/warnings` stays accurate. Canary tests assert clean round-trips stay empty.
- **#2** (search in route handler) was already fixed before this session.
- **#9** (Map-based store lookups) deliberately **deferred to ADR-0003**.
- 94 tests pass; build + lint clean. Verified live against `fall-of-troy` (landing + edit view).

---

## Previous Focus

**[ADR-0008] YAML Frontmatter for Metadata** — implementation **complete and merged to `main`**
(commits `834f926`, `c71b570`, `e4ba8ad`, then follow-ups `b21b138`, `e9b987e`, `e7512a2`).
All work is on `main`; the original `task/yaml-frontmatter-metadata` branch can be deleted.

### What is done
- ADR-0008 written and accepted; ROADMAP updated.
- `js-yaml` added to `packages/shared`.
- `aliases` field added to `ParsedFolio`, `FolioIndexRecord`, and `ParsedFolioSchema`.
- Parser/serializer rewritten: `## Meta` replaced with YAML frontmatter.
- Wikilink rewriter gained frontmatter guard.
- Server propagates `aliases` through index, save, create, and search.
- All 27 `fall-of-troy/` files rewritten to frontmatter.
- `docs/data-model.md` updated with format spec + frontmatter parse-error contract.
- **Parser hardening (post-merge):** malformed YAML throws (surfaced as warning at
  index time, 500 at read time); valid-but-non-mapping YAML warns. Two tests pin
  both behaviors as intentional.
- **Search extraction (housekeeping):** scoring logic moved from the `/api/search`
  inline handler into `ProjectStore.search()`. Direct unit tests in
  `packages/server/src/projectStore.test.ts` (8 tests). ROADMAP housekeeping item
  checked off.
- 90 tests pass across all packages.

### What remains
- **Client UI: render aliases in sidebar / detail view / search results.**
  `aliases` already flows to the client via `FolioIndexRecord` and the full `ParsedFolio`.
  This is a purely presentational addition — no backend or format changes needed.
  The design call (where to show them, how to style) is the only blocker.

### Next session can begin by
1. Deciding where aliases should appear (sidebar chips? detail subtitle? search highlight?).
2. Wiring the React components to render the already-available `aliases` array.

---

Last updated: 2026-06-19
