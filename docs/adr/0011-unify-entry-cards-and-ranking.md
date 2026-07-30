# 11. Unify Entry Cards and Ranking

**Date:** 2026-07-30
**Status:** Proposed

## Context

A folio is presented as a compact "entry" in five places, each hand-rolled with its own markup,
its own CSS module, and its own choice of which fields to show:

| Where | Component | Shows |
|---|---|---|
| Header search dropdown | `TopHeader` | title, folder, snippet |
| Linked Mentions | `BacklinksPanel` | title, folder, snippet |
| Category index rows | `CategoryIndexView` | title, then snippet *or* tags as a fallback |
| Grand Index | `GrandIndexView` | type icon, title |
| Sidebar folio list | `Sidebar` | title |

The same entity therefore looks different depending on where you meet it: the Grand Index shows a
type icon that no other surface shows, the category index substitutes tags when a snippet is
missing while the others just omit it, and only two of the five show the folder. Adding a field —
`aliases` being the immediate case — means touching five components and deciding the presentation
question five times.

Behind the visual drift sits a second, worse duplication: **three independent implementations of
folio ranking.**

1. `ProjectStore.search()` (server) — scores title, name, aliases, tags, folder, and snippet
   across documented tiers, and is unit-tested.
2. `GrandIndexView` — its own client-side copy: title, name, folder, snippet. No aliases, no tag
   scoring.
3. `CategoryIndexView` — a third, narrower copy: title, name, snippet. No aliases, no folder, no
   tags.

These have already diverged in a user-visible way. Searching an alias in the header finds the
folio, because the server scores aliases; typing the same alias into the Grand Index or a category
index finds nothing, because those copies never learned about them. The same query gives three
different answers depending on which box it is typed into.

## Decision

Two consolidations, which can land independently:

- **A shared entry-card component.** One component renders a folio index record, with variants for
  the contexts that genuinely differ (dropdown row, panel card, index row, sidebar link) rather
  than five unrelated implementations. It owns the decision about what an entry shows and in what
  order, so adding a field is one change. Presentation rules move into
  `docs/design-system.md`.
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
- The shared scorer is directly unit-testable in `packages/shared`, where the existing scoring
  tests for `ProjectStore.search()` can largely move.
- This touches `packages/shared`, `packages/server`, and `packages/client`, which `AGENTS.md`
  classifies as a cross-package refactor requiring human review before it lands.
- Variants are a risk: if the four card contexts need more divergence than expected, a single
  component with many flags is worse than what it replaces. If that happens, prefer a shared
  layout primitive plus per-context composition over one component with a wide prop surface.
- Existing per-view CSS modules are consolidated or removed, so the token-based styling must be
  re-verified against `docs/design-system.md` in both light and dark contexts.
