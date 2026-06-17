# PICKUP

Where the last session left off. Update this when you stop, so the next session starts with context
instead of archaeology. For the feature backlog, see [docs/ROADMAP.md](docs/ROADMAP.md).

## Current Focus

**[ADR-0008] YAML Frontmatter for Metadata** — implementation is in progress.

### What is done
- ADR-0008 written and accepted; ROADMAP updated.
- `js-yaml` added to `packages/shared` (2 deps, not gray-matter).
- `aliases` field added to `ParsedFolio`, `FolioIndexRecord`, and `ParsedFolioSchema`.
- Parser/serializer rewritten: `## Meta` section replaced with YAML frontmatter (`---`…`---`) holding `type`, `tags`, and optional `aliases`.
- Wikilink rewriter gained a frontmatter guard.
- Server `projectStore.ts` and `folios.ts` propagate `aliases` through index build, save, and create.
- Search (`routes/index.ts`) scores aliases (exact +80, prefix +40, contains +8).
- All 80 tests pass (shared + server + client).
- All 27 `fall-of-troy/` sample files rewritten to frontmatter; some seeded with real aliases (Achilles → Pelides, Odysseus → Ulysses, etc.).

### What remains
1. **Update `docs/data-model.md`** — replace the `## Meta` description and example with the new YAML frontmatter format. This is the only documentation still out of sync.
2. **Client-side alias display** — `FolioIndexRecord` now carries `aliases`, but the React client does not render them in the sidebar, detail view, or search results. This is a UI-only addition; the data is already flowing.
3. **Commit** — this is a breaking format change spanning ADR, code, tests, and sample data. It should be one or two conventional commits on branch `task/yaml-frontmatter-metadata`.

### Next session can begin by
1. Updating `docs/data-model.md` to document the frontmatter format.
2. Optionally wiring `aliases` into the React UI (sidebar chips, detail page alias list).
3. Committing the branch.

---

Last updated: 2026-06-17
