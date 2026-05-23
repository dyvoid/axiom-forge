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
2. **Meta section is always present:** Appended directly below the H1, the `## Meta` block is synthesized by the app (it is not in the schema). It identifies `Type` and `Tags`.
3. **Empty fields are omitted:** No placeholder dashes or empty values are ever written to disk.
4. **Sections are omitted if empty:** A section is only written if it contains at least one non-empty field.
5. **Prose fields:** Rendered as free text directly under the section header, with no bullet prefix.
6. **All other fields:** Use the `- **Field Name:** value` bullet format.

**Example Minimal Folio:**
```markdown
# Telamonas

## Meta
- **Type:** Character
- **Tags:** warrior

## Basic Information
- **Date of Death:** 1497 BCE
- **Species:** [[Species/Human]]
- **Place of Origin:** [[Locations/Kea]]

## Description & History
Warrior who died defending Kea during the Mycenaean invasion. Close friend of Arion.
```

## Save Validation

Before writing to disk, the server validates incoming data:
- Unknown sections or fields trigger a `400` error.
- Invalid `select` values trigger a `400` error.
- Broken wiki-links (pointing to non-existent folios) are allowed to save, but return a warning array so the UI can flag them.
