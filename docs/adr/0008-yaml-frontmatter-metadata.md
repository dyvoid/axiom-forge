# 8. YAML Frontmatter for Entry Metadata

**Date:** 2026-06-17  
**Status:** Accepted

## Context

Every entry carries machine-readable metadata — its `Type` and `Tags`. Today this lives in a
custom `## Meta` section synthesized by the app and written directly below the H1:

```markdown
# Achilles

## Meta
- **Type:** Human
- **Tags:** greek, hero
```

This format is an Axiom Forge invention. No other tool understands it. That directly undercuts a
core product guarantee — Obsidian compatibility — in three ways:

1. **It is invisible to Obsidian.** Obsidian reads metadata from YAML frontmatter (its "Properties"
   system). The `## Meta` block is just an ordinary section to Obsidian: not shown in the
   Properties panel, not query-able by Bases, and `Tags` here are plain text, not real Obsidian tags.
2. **It is non-standard everywhere else too.** YAML frontmatter is the de-facto metadata convention
   across Jekyll, Hugo, Astro, Logseq, and Obsidian. A `## Meta` bullet list is foreign to all of them.
3. **It conflates metadata with content.** `## Meta` masquerades as a content section when it is
   really machine metadata about the file.

`tags` and `aliases` are *natively* special in Obsidian; `cssclasses` is too. Custom keys such as
`type` are stored and surfaced gracefully as Text properties. Adopting frontmatter therefore makes
our files render correctly in Obsidian's Properties panel and become query-able by Obsidian Bases
at zero additional cost.

The project is early-stage and single-user, so a clean breaking change is acceptable — no
dual-format support is warranted.

## Decision

Replace the `## Meta` section with standard YAML frontmatter delimited by `---`:

```markdown
---
type: Human
tags:
  - greek
  - hero
aliases:
  - Pelides
---

# Achilles

## Basic Information
- **Born:** c. 1235 BCE
```

Specifics:

- **Keys:** `type` (custom, maps to a schema type key), `tags` (native Obsidian list), and
  `aliases` (native Obsidian list, optional). All three are emitted as YAML block lists.
- **H1 stays the display title.** It remains in the body; the title is not moved into frontmatter.
  This keeps files rendering correctly in every Markdown viewer and matches how Obsidian itself
  treats H1 vs. filename.
- **Body wikilink fields stay in the body.** Relationship/wikilink sections (Allegiance, Allies,
  etc.) remain ordinary body sections, not frontmatter. Obsidian does not track frontmatter
  wikilinks as backlinks or graph edges, so moving them would lose link semantics for pure-Obsidian
  users. Only `type`/`tags`/`aliases` go in frontmatter.
- **Parser:** `js-yaml` is adopted as the frontmatter parser/serializer in `packages/shared`,
  the only new dependency this change introduces. `gray-matter` was considered and rejected: it
  wraps `js-yaml` and adds Markdown-body parsing we don't need, so depending on `js-yaml`
  directly gives better control over emission (for idempotency) with fewer transitive deps.
- **Clean cut:** no backwards-compatible reader for `## Meta`. All sample data is rewritten to the
  new format in the same change.
- **Parse-error contract:** frontmatter is treated as a hard contract, not a forgiving hint.
  Malformed YAML (syntax errors) throws from `parseMarkdown` — at index time the error is caught
  and surfaced as a per-folio warning; at read time it produces a `500`. A broken file should be
  visible, not silently treated as having an empty type. Valid YAML that isn't a mapping (e.g. a
  bare list as the entire payload) is a semantic error rather than a syntax one, so it degrades
  gracefully: empty `type` plus a warning. Missing frontmatter is treated as an empty mapping.

## Consequences

- **Every `.md` file changes.** All 27 `fall-of-troy/` sample files are rewritten. Any file still
  using `## Meta` after this lands will parse with an empty `type`; this is acceptable given the
  early-stage, single-user context.
- **New dependency:** `js-yaml` is added to `packages/shared` (2 transitive deps). It handles
  YAML parsing and emission; `lineWidth: -1` guarantees stable output so round-trip
  idempotency is preserved.
- **`aliases` is a new optional field** on `ParsedFolio` and `FolioIndexRecord`. Search and the
  sidebar can match on it without a full-entry fetch. The serializer omits the `aliases` key
  entirely when empty.
- **Round-trip fidelity is critical.** `parseMarkdown → serializeToMarkdown → parseMarkdown` must
  remain stable and idempotent across the frontmatter boundary. The existing idempotency test
  guards this; YAML emission options are pinned if list formatting proves unstable.
- **The wikilink rewriter gains a frontmatter guard** — it peels off the leading `---`…`---` block
  before rewriting body links and reassembles afterward. Defensive: our frontmatter holds no
  wikilinks today, but this prevents any future false match.
- **Obsidian compatibility improves substantially:** `tags` and `aliases` become real Obsidian
  properties; entries are visible in the Properties panel and query-able by Obsidian Bases with no
  extra setup. Obsidian Publish keys (`publish`, `permalink`, etc.) are supported for free because
  unknown frontmatter keys are ignored rather than rejected.
- **`docs/data-model.md` must be updated** to document the frontmatter format and drop the
  `## Meta` description.
