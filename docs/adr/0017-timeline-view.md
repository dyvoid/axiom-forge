# 17. Timeline View

**Date:** 2026-08-21
**Status:** Proposed — blocked on [ADR-0015](0015-structured-date-fields.md)

## Context

A chronological view was raised independently by several personas during roadmap
review — a GM's session log, a novelist's in-world event ordering, a screenwriter's
episode/season sequence. All are the same underlying need: lay out entries of a type
along an axis by a sortable value.

This is only possible once a date field actually carries a sortable value, which it
does not today (see [ADR-0015](0015-structured-date-fields.md)). This ADR is the view;
0015 is the prerequisite data model.

## Decision

Any type with a schema field in `sortkey` or `calendar` `dateMode` (per ADR-0015) can be
viewed as a timeline: its entries laid out along an axis ordered by the field's value,
rendered as a point (`start === end`) or a span (`start < end`). Not tied to a fixed
"Events" concept — applies to whichever type and field the schema designates.

## Open Questions

- If a type has more than one dated field, which drives the timeline — a schema-level
  designation, or a per-view choice?
- Types with no dated entries: excluded from the view picker entirely, or shown empty?
- Does the axis attempt calendar-aware, proportional spacing (real elapsed time for
  `calendar` mode), or is it purely ordinal (evenly spaced by sort order regardless of
  gap size)? These differ significantly for `sortkey` mode, where there is no real
  calendar to be proportional against.

## Consequences

- **Positive:** The most cross-persona-requested view explored in this round of
  planning.
- **Negative:** Cannot start before ADR-0015 lands — strictly sequenced, not
  parallelizable with the rest of [ADR-0016](0016-alternate-data-views.md)'s views.
