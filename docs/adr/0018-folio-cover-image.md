# 18. Folio Cover Image

**Date:** 2026-08-21
**Status:** Proposed

## Context

No image field type, image-recognition syntax, or static file serving exists anywhere
in the project today. A Wikipedia-infobox-style photo — one image prominently shown for
a folio, and as a thumbnail elsewhere the folio is referenced — was raised as a
high-value, widely-wanted gap.

This must stay optional: no folio should be required to have an image, and existing
projects need no schema change to keep working. It must also stay Obsidian-compatible
and, per [ADR-0007](0007-consolidate-folio-integrity.md)'s folio walker, is
already compatible by construction — `fileIO.ts` already filters to `.endsWith('.md')`
when scanning folders, so a co-located image file is silently ignored by the existing
scan with no changes needed there.

Inline, in-body images (embedded within a section's content, potentially multiple per
folio) are a related but distinct feature, explicitly deferred — this ADR covers only
the single per-folio cover image.

## Decision

A folio may have one optional cover image, co-located with its `.md` file: same folder,
same basename, an image extension (`Odysseus.png` beside `Odysseus.md`). This is a
built-in per-folio property available to every type regardless of schema — not a
schema-defined field an author opts a type into, the same way `title` isn't schema-
defined today.

- Read view renders it Wikipedia-infobox style, prominently in the basic-information
  area.
- Other views (table, board, cards — see [ADR-0016](0016-alternate-data-views.md)) that
  reference a folio render it at thumbnail size.
- Entirely optional: a folio with no matching image file renders with none, no schema
  warning, no requirement anywhere.
- The server needs a new static-file-serving surface for images that does not exist
  today.

## Open Questions

- Which extensions are recognized (`.png`, `.jpg`/`.jpeg`, `.webp`, others), and what
  happens if more than one matches the same basename.
- Upload workflow in the edit view — drag-drop, file picker, and how the file lands in
  the project folder.
- Whether folio rename/delete needs to also rename/delete the co-located image. Same
  basename makes this a fixed 1:1 pairing rather than the arbitrary multi-file fan-out
  [ADR-0010](0010-multi-file-write-safety.md) was concerned with, but it's still a second
  file touched by a single-file operation today.
- Static serving path/URL scheme, and any size or dimension limits.

## Consequences

- **Positive:** High-value, widely requested; fully opt-in via file presence, so no
  `schema.json` migration is needed for any existing project.
- **Negative:** First item in the current backlog that isn't a single-subsystem change
  — touches file recognition, static serving, upload UI, and folio rename/delete, in one
  feature.
- **Neutral:** Inline in-body images and any thumbnail-generation/caching concerns at
  scale are explicitly out of scope here.
