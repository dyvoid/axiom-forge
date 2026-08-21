# 15. Structured Date Fields (Sort Key & Calendar Modes)

**Date:** 2026-08-21
**Status:** Proposed

## Context

The `date` field type is currently a plain string, parsed identically to `text`
(`parser.ts`, `parseFieldValue`). It has no sortable value, which blocks any timeline
or chronological view (see [ADR-0017](0017-timeline-view.md)) and is the same gap
genealogists hit needing approximate dates ("circa 1850," "between 1000 and 1200").

Values like "circa 1850" or a fictional-calendar label ("Third Age, Year 15") cannot be
parsed into a sortable value automatically — there is no general rule for turning prose
into a date, and this project does not parse strings to infer meaning. Any sortable
value must be explicitly authored, never inferred.

The project is Obsidian-first: files are frequently hand-edited as plain YAML
frontmatter with no app UI in front of them. Any structured addition must stay
representable as ordinary, optional, flat YAML — never a required field, never a
nested object a person has to construct by hand.

## Decision

Add a `dateMode` option to the `date` field definition: `text` (default), `sortkey`, or
`calendar`.

- **`text`** — current behavior, unchanged. A free string, no sortable value, no
  migration needed for existing projects.
- **`sortkey`** — the existing string stays the display value. An optional, separate
  flat frontmatter key (`<field>_sort`) may hold a number, or a range using a
  `start..end` shorthand. Absent unless the author adds it.
- **`calendar`** — the edit view renders an actual date/datetime picker. The field's
  value is a real date, stored as ISO 8601 (`2026-08-21` for a point, the ISO interval
  form `2026-08-21/2026-08-25` for a range) — both plain strings a person can type by
  hand in Obsidian. An optional display-override string may still be set if the author
  wants custom label text ("Spring 1850") instead of the formatted ISO value.

Internally (in memory only — not on disk), every mode with a value normalizes to a
`{ start, end }` shape, where a point is `start === end`. Downstream consumers (sorting,
timeline rendering) branch on this one shape rather than two incompatible
point-vs-range representations.

## Open Questions

- Exact range shorthand syntax for `sortkey` mode (`1000..1200` assumed, not settled).
- Which date/time picker library `calendar` mode depends on — none exists in the
  project today.
- Validation behavior for a malformed `_sort` value or ISO interval: warn like other
  schema violations, block the save, or ignore silently?
- Does a `calendar`-mode display override interact with search (search matches display
  text, sort uses the ISO value) in any way that needs special-casing?

## Consequences

- **Positive:** Unlocks timeline view and generalizes to real-world-date use cases
  (genealogy-adjacent) without building anything genealogy-specific, and without ever
  parsing free text to infer structure.
- **Negative:** Three modes to build and test instead of one. Every future consumer of
  date values must handle the point-vs-range duality.
- **Neutral:** No migration for existing projects — `text` remains the default and
  behaves exactly as today.
