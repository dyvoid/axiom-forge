# 12. Markdown Source Edit Mode

**Date:** 2026-08-21
**Status:** Proposed

## Context

The edit view (`FolioEditView`) renders structured form fields from the schema — one
input per field, custom controls for selects, multiselects, wikilinks, text-lists, and
dates. This is the right default for most editing: it enforces the schema, validates on
save, and keeps the user inside the product's mental model.

But the files are plain Markdown, and the product guarantees Obsidian compatibility.
A user who wants to bulk-edit raw Markdown, paste in a large block from an external
source, or fix something the structured editor can't represent (a field the parser
tolerates but the schema doesn't know about, a heading level the form editor normalizes
away) has to leave the app and edit the `.md` file in another tool.

A Markdown source mode — a toggle in the edit view that shows the raw file content in a
plain textarea — would keep those workflows inside the app. The user stays in Axiom
Forge, saves through the same API, and gets the same broken-link detection and schema
validation on save.

## Decision

Add a toggle in `FolioEditView` between two modes:

1. **Form mode** (current) — structured field editors rendered from the schema.
2. **Source mode** — a single textarea showing the raw Markdown file content.

Source mode loads the raw file content from the server (the unserialized source, not a
re-serialization of the parsed folio), lets the user edit it as text, and saves it back
through the same PUT endpoint. On save, the server parses and validates the Markdown
exactly as it does for form-mode saves — broken links and schema warnings surface in the
same way.

The toggle is a local UI state, not a route change. Unsaved changes in one mode block
switching to the other (same unsaved-changes guard).

## Open Questions

1. **Round-trip fidelity.** The parser (`parseMarkdown`) and serializer
   (`serializeToMarkdown`) are not guaranteed to be identity functions — the structured
   editor works on the parsed `ParsedFolio` and serializes on save. If a user edits in
   source mode, saves, then switches to form mode, the form shows the *re-parsed* result,
   which may differ from what they typed (whitespace, heading normalization, list
   formatting). Is this acceptable, or does source mode need to preserve the exact bytes
   until the user explicitly switches to form mode?

2. **Unknown fields.** If the Markdown contains fields or sections the schema doesn't
   define, the parser currently tolerates them (they land in `sections` as unparsed
   blocks or are silently dropped depending on the field type). Source mode would let
   users write anything. Should source-mode saves warn on unknown fields, or pass them
   through silently the way the parser already does?

3. **Schema validation severity.** Form mode prevents some invalid inputs at the UI
   level (date pickers, select dropdowns). Source mode can't. Should source-mode saves
   run the same validation and block on errors, or save-and-warn the way broken links
   already work?

4. **Editor features.** Is a plain textarea sufficient, or should source mode include
   syntax highlighting, line numbers, or a preview pane? A plain textarea is the simpler
   default; highlighting adds a dependency (e.g. CodeMirror) that the project currently
   doesn't have.

## Consequences

- **Positive:** Keeps raw-Markdown editing workflows inside the app. Power users and
  external-paste workflows don't require leaving Axiom Forge. Obsidian compatibility is
  reinforced — the user can see and edit exactly what Obsidian sees.
- **Negative:** Two edit paths mean two ways to produce invalid state. Form mode
  prevents some errors at the UI level; source mode can't. The validation and warning
  pipeline must handle both uniformly.
- **Neutral:** The toggle adds a small amount of UI complexity to the edit view. The
  unsaved-changes guard already exists and extends naturally to mode-switching.
