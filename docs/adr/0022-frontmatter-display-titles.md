# 22. Frontmatter Display Titles

**Date:** 2026-09-10
**Status:** Accepted — implemented 2026-09-10
**Supersedes:** [ADR-0008](0008-yaml-frontmatter-metadata.md)

## Context

ADR-0008 moved folio metadata into YAML frontmatter but deliberately kept the display title as a
body H1. In Obsidian, the filename already appears as the note's inline title. The body H1 therefore
renders a second title below the Properties panel, creating a large empty gap and a duplicate label
before the folio's first real section.

The split also makes one piece of structured folio identity live in the Markdown body while `type`,
`tags`, and `aliases` live in Properties. Obsidian can display and query a custom `title` property,
so the body H1 adds visual noise without adding Obsidian functionality.

## Decision

Store the folio's display title in the YAML frontmatter `title` property and omit the body H1 from
newly serialized files:

```markdown
---
title: Achilles
type: Human
tags:
  - greek
aliases:
  - Pelides
---

## Basic Information
- **Sex:** Male
```

The parser uses the following precedence:

1. A non-empty string `title` in frontmatter.
2. A legacy body H1 when frontmatter has no usable title.
3. The humanized filename, supplied by the server when neither source exists.

If a transitional file contains both a frontmatter title and an H1, frontmatter wins. Saving any
legacy or transitional folio writes the canonical frontmatter form and removes the H1. No separate
migration command is required for external projects.

The preface is now the region after frontmatter and before the first `##` section. Cover-image
extraction continues to use the first image embed in that region.

All other decisions from ADR-0008 remain in force: `type`, `tags`, and `aliases` stay in
frontmatter; body wikilinks stay in the body; malformed YAML remains an error; and serialization
must remain round-trip stable.

## Consequences

- Obsidian shows one inline note title, followed by Properties and the folio's content sections,
  without a duplicate body title.
- Titles become queryable alongside the rest of a folio's Properties.
- Generic Markdown viewers no longer receive a body H1. They still expose the title as standard
  YAML frontmatter, favoring the project's Obsidian-first contract over standalone rendering.
- Existing projects remain readable. Each legacy folio migrates when the application next saves
  it; the bundled `fall-of-troy` project is migrated with this decision.
- Renaming behavior does not change. Editing the display title still derives a new filename and
  rewrites incoming wiki-links.
- Frontmatter title escaping is handled by the existing `js-yaml` serializer, including punctuation
  and values with YAML-special characters.

## Implementation

`packages/shared/src/parser.ts` reads `title` before falling back to the legacy H1 and serializes the
title as the first frontmatter property. Parser and server tests cover canonical output, legacy
fallback, transitional precedence, rename behavior, and round-trip stability.
