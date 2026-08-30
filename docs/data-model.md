# Data Model

This document defines the on-disk file format. It is the contract between the application, the local filesystem, and any external tools (like Obsidian) that read the raw markdown.

## Project Files

### `config.json`
Project identity and UI preferences. Always present in the project root.
```json
{
  "name": "My World",
  "description": "A brief description of the project.",
  "version": "1.0.0"
}
```

### `schema.json`
Defines all folio types, their sections, fields, and field types. The app reads this on startup and builds its entire UI from it. Nothing about folio types is hardcoded in the app.

```json
{
  "version": "1.0.0",
  "types": {
    "Character": {
      "icon": "user",
      "folder": "Characters",
      "sections": {
        "Basic Information": {
          "role": "meta",
          "fields": {
            "Sex": { "type": "select", "options": ["Male", "Female"] },
            "Place of Origin": { "type": "wikilink", "target": "Locations" }
          }
        },
        "Description & History": { "role": "prose", "type": "textarea" }
      }
    }
  }
}
```

## Field Types

| Type | Storage in Markdown | Description |
|---|---|---|
| `text` | `- **Field:** value` | Single-line freeform text. |
| `textarea` | Free prose under section header | Multi-line text. HTML inline tags (bold, italic) and lists are parsed. |
| `date` | `- **Field:** value` | Freeform date string (`1497 BCE`, `Year 42`). |
| `select` | `- **Field:** value` | Dropdown value from predefined list. |
| `multiselect` | `- **Field:** val1, val2` | Multiple tags from predefined list. |
| `text-list` | `- **Field:** val1, val2` | Multiple freeform text tags. |
| `wikilink` | `- **Field:** [[Folder/Name]]` | Single link to another folio. |
| `wikilink-list` | `- **Field:** [[F/A]], [[F/B]]` | Multiple links to other folios. |

**Wiki-Link Resolution:**
Wiki-links use the **folder name** of the target type, not the type key. For example, `[[Characters/Thalirin]]` resolves to `Characters/Thalirin.md`.

## Markdown Serialization Rules

`shared/parser.ts` handles the Markdown ↔ JSON structured data round trip.

1. **Filename vs Display Name:** The `# Heading` inside the file is the source of truth for display. The filename is derived from the H1 with spaces replaced by underscores (e.g., `Mycenaean_Invasion_of_Kea.md`).
2. **Frontmatter metadata is always present:** A YAML frontmatter block (`---`…`---`) at the very top of the file identifies `type`, `tags`, and optionally `aliases`. These are native Obsidian Properties — `tags` and `aliases` are special-cased by Obsidian, while `type` is a custom property that maps to a key in `schema.json`.
3. **Empty fields are omitted:** No placeholder dashes or empty values are ever written to disk.
4. **Sections are omitted if empty:** A section is only written if it contains at least one non-empty field.
5. **Prose fields:** Rendered as free text directly under the section header, with no bullet prefix.
6. **All other fields:** Use the `- **Field Name:** value` bullet format.

**Example Minimal Folio:**
```markdown
---
type: Character
tags:
  - warrior
aliases:
  - The Red
---

# Telamonas

## Basic Information
- **Date of Death:** 1497 BCE
- **Species:** [[Species/Human]]
- **Place of Origin:** [[Locations/Kea]]

## Description & History
Warrior who died defending Kea during the Mycenaean invasion. Close friend of Arion.
```

## Validation

One rule engine, `validateAgainstSchema` in `shared/schema.ts`, is the definition of every folio
validation rule. Both directions call it; the `mode` argument decides the severity, and which
rules run ([ADR-0009](adr/0009-consolidate-folio-validation-rules.md)):

| Rule | Reading a file (`read`) | Saving a folio (`write`) |
|---|---|---|
| Unknown type | warning | `400` |
| Unknown section | warning | `400` |
| Unknown field | warning | `400` |
| Invalid `select`/`multiselect` value | warning | `400` |
| Wrong value shape for the declared type | not checked | `400` |

Reading is lenient and writing is strict, deliberately: schema drift already written to disk is
shown rather than suppressed, while anything the app itself writes must conform. `wrong-shape` is
the one asymmetric rule — it asks whether a save payload is well-formed, and a file on disk has
already been coerced into shape by the parser, so on the read path it has nothing to say.

A file with no `type` at all is not checked against the schema; there is nothing to check it
against, and a typeless file is a different problem from a non-conforming one.

Broken wiki-links (pointing to non-existent folios) are not part of this engine. They are allowed
to save, and return a warning array so the UI can flag them.

## Frontmatter Parse Errors

The parser treats frontmatter as a hard contract, not a forgiving hint:

- **Malformed YAML (syntax error):** `parseMarkdown` throws. At index time the error is caught and surfaced as a per-folio warning; at read time it produces a `500`. A broken file should be visible, not silently treated as having an empty type.
- **Valid YAML but not a mapping** (e.g. a bare list or scalar as the entire payload): the parser returns an empty `type` and emits a warning (`"Frontmatter is valid YAML but not a mapping"`). This is a semantic error, not a syntax one, so it degrades gracefully rather than throwing.
- **Missing frontmatter:** treated as an empty mapping — `type` is `""`. Schema conformance is skipped entirely for such a file (see [Validation](#validation)), so it produces no "Unknown type" warning; the sections are kept as raw prose.
