# 16. Alternate Data Views (Table, Board, Saved Filters, Graph)

**Date:** 2026-08-21
**Status:** Proposed

## Context

The app currently offers two ways to look at data: the read view (one folio at a time)
and the backlinks panel. The schema and link index already computed for every project
support far more — table/database views, grouped boards, and network graphs are all
standard in comparable tools (Obsidian's own views, Notion databases) and were raised
independently by multiple personas during roadmap review.

Any view here must stay domain-agnostic: nothing may assume what kind of project a
schema describes. A view is valid only if it works identically for a genealogy schema,
a campaign schema, or a show bible schema, with no special-casing per domain.

## Decision

Build four views, in priority order, each usable without any schema or storage change:

1. **Table/grid view** — one row per entry of a chosen type, one column per schema
   field, sortable and filterable. Needs nothing new; works on any project today.
2. **Board/kanban view** — groups entries of a type by the values of any existing
   `select` field the viewer picks at view time (not a fixed "status" concept — any
   select field the schema happens to have).
3. **Saved/pinned filter views** — persists a search+filter combination as a named,
   revisitable view. Composes with 1 and 2 (a saved board scoped to a filter).
4. **Graph view** — node/edge visualization of the existing wikilink index. No new
   field types required, but meaningfully higher implementation cost than 1–3 (layout,
   rendering, performance at scale).

Timeline view is a fifth candidate view but is tracked separately in
[ADR-0017](0017-timeline-view.md) since it is blocked on [ADR-0015](0015-structured-date-fields.md)
and cannot start alongside these four.

## Open Questions

- Where views live in navigation — per-type tab, project-level view picker, or both.
- Table view: all fields shown by default, or a user-configurable column subset?
- Graph view library choice, and where it draws the line on node count / performance.
- Do saved views persist per-project (a small view-config file) — the natural default
  for a single-user local tool — or is per-user relevant at all here?

## Consequences

- **Positive:** Immediate payoff across nearly every persona surveyed; none of the four
  require schema or storage changes, so existing projects gain them for free.
- **Negative:** Four separate UI surfaces to build and maintain.
- **Neutral:** Purely a client-side feature for views 1–3; graph view only reads the
  link index the server already maintains.
