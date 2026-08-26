# 11. Unify Entry Cards and Ranking

**Date:** 2026-07-30
**Status:** Accepted — implemented

## Context

A folio is presented as a compact "entry" in five places — the header search dropdown, Linked
Mentions, category index rows, the Grand Index, and the sidebar list — each hand-rolled with its
own markup, its own CSS module, and its own choice of which fields to show. The same entity
therefore looks different depending on where you meet it: only the Grand Index shows a type icon,
only the category index substitutes tags when a snippet is missing, and only two of the five show
the folder. Adding a field — `aliases` being the immediate case — means touching five components
and deciding the presentation question five times.

Behind the visual drift sits a second, worse duplication: **three independent implementations of
folio ranking.** `ProjectStore.search()` scores title, name, aliases, tags, folder, and snippet
across documented tiers and is unit-tested; `GrandIndexView` carries its own client-side copy with
no aliases and no tag scoring; `CategoryIndexView` a third, narrower copy with neither aliases,
folder, nor tags.

These have already diverged in a user-visible way. Searching an alias in the header finds the
folio, because the server scores aliases; typing the same alias into the Grand Index or a category
index finds nothing. The same query gives three different answers depending on which box it is
typed into.

## Decision

Two consolidations, which can land independently:

- **A shared entry-card component.** One component renders a folio index record, with variants for
  the contexts that genuinely differ, rather than five unrelated implementations. It owns the
  decision about what an entry shows and in what order, so adding a field is one change.
  Presentation rules move into `docs/design-system.md`.
- **A shared ranking function.** Extract the scoring tiers into `packages/shared` as a pure
  function over `FolioIndexRecord`, and have `ProjectStore.search()` and both client-side index
  filters call it. The server keeps ownership of result limiting and tie-breaking; only the
  per-record scoring is shared. This matches the existing invariant that parsing and validation
  live in `packages/shared` so client and server cannot diverge — ranking belongs to the same
  category and was simply missed.

## Consequences

- One query gives one answer everywhere. Aliases, tags, and folder matching behave the same in the
  header, the Grand Index, and any category index.
- Adding or reordering a field on an entry becomes a single change instead of five, and cannot
  silently apply to some surfaces and not others.
- The shared scorer is directly unit-testable in `packages/shared`.
- This touches all three packages, which `AGENTS.md` classifies as a cross-package refactor
  requiring human review before it lands.
- Variants are a risk: if the card contexts need more divergence than expected, a single component
  with many flags is worse than what it replaces. If that happens, prefer a shared layout
  primitive plus per-context composition over one component with a wide prop surface.
- Existing per-view CSS modules are consolidated or removed, so token-based styling must be
  re-verified against `docs/design-system.md`.

## Implementation

**Shared ranking** lives in `packages/shared/src/folioSearch.ts`, exporting `scoreFolio` (one
record, one query, returns 0 for no match) and `rankFolios` (score, drop non-matches, sort by
score with alphabetical tie-breaking). `ProjectStore.search()` is now `rankFolios(...).slice(0, 20)`.
Ordering deliberately stayed with the callers, as the Decision anticipated: the Grand Index groups
alphabetically by letter, and a category index preserves its alphabetical order and uses the score
purely as a filter. Two intended behaviour changes fall out: the index views now score **tags**
(previously server-only), and the category index now scores **folder paths**.

**Shared presentation** lives in `packages/client/src/components/ui/EntryContent.tsx` with three
variants — `card` (search dropdown, Linked Mentions), `row` (category index), `inline` (Grand
Index). It renders content only and never a wrapper: callers keep their own `Link`/`NavLink`/`div`
plus hover, active, keyboard-highlight and grid styling. That split kept the prop surface at three
(`folio`, `variant`, `icon`), avoiding the flag explosion the Consequences warned about.

**Deviation from the Decision:** the sidebar was left alone. It renders the title and nothing else,
so there is no field set to share — routing it through `EntryContent` would be indirection wrapping
a single expression. The unification is four surfaces, not five.

The layout rules the two idioms settled on — card versus index line, field order, ellipsis over
wrapping, content-relative column widths — are documented in `docs/design-system.md`, which is
where they belong once the decision is made.
