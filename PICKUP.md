# PICKUP

Where the last session left off. Update this when you stop, so the next session starts with context
instead of archaeology. For the feature backlog, see [docs/ROADMAP.md](docs/ROADMAP.md).

## Current Focus

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
