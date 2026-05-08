# 01 — Data Model

> **Reads:** [`README.md`](../README.md). **Read before:** `02_Reference_Schema.md`, `03_Backend.md`.

This document defines the on-disk file format. It is the contract between the app and the project folder — implementers and Obsidian power-users both rely on it.

---

## Project Files

### `config.json`

Project identity and UI preferences. Always present in the project root.

```json
{
  "name": "My World",
  "description": "A brief description of the project.",
  "version": "1.0.0",
  "theme": {
    "accent": "#9a7a2c"
  }
}
```

**Fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | ✓ | Project display name, shown in the app header |
| `description` | string | | Short description, shown on the project home screen |
| `version` | string | | Project schema version for future migration support |
| `theme.accent` | hex color | | Primary accent color used throughout the UI (default `#9a7a2c`) |

The app ships a single visual theme (the parchment palette shown in the mockups). There is no light/dark toggle.

---

### `schema.json`

Defines all folio types, their sections, fields, and field types. The app reads this on startup and builds its entire UI from it. Nothing about folio types is hardcoded in the app.

**Top-level structure:**

```json
{
  "version": "1.0.0",
  "types": {
    "Character": { ... },
    "Location": { ... },
    "Event": { ... }
  }
}
```

**Per-type structure:**

```json
"Character": {
  "icon": "user",
  "folder": "Characters",
  "inactiveWhen": ["Deceased"],
  "sections": {
    "Basic Information": {
      "role": "meta",
      "fields": {
        "Other Names": { "type": "text-list" },
        "Sex": {
          "type": "select",
          "options": ["Male", "Female", "Other", "None"]
        },
        "Date of Birth": { "type": "date" },
        "Date of Death": { "type": "date" },
        "Place of Origin": { "type": "wikilink", "target": "Locations" }
      }
    },
    "Description & History": { "role": "prose", "type": "textarea" },
    "Notes": { "type": "textarea" }
  }
}
```

**Type properties:**

| Property | Required | Description |
|---|---|---|
| `icon` | ✓ | Lucide icon name (kebab-case) for the sidebar and folio header |
| `folder` | ✓ | Subfolder name where this type's `.md` files are stored |
| `inactiveWhen` | | Array of Status values that mark a folio as inactive |
| `sections` | ✓ | Ordered map of section names to their field definitions |

The full reference schema for *Burden of the Guardian* lives in [`02_Reference_Schema.md`](02_Reference_Schema.md).

---

## Field Types

| Type | Storage in Markdown | UI Input | Description |
|---|---|---|---|
| `text` | `- **Field:** value` | Single-line text input | Short freeform values: names, ages, measurements |
| `textarea` | Free prose under section header | Multi-line text editor | Long-form prose: descriptions, history, notes |
| `date` | `- **Field:** value` | Text input | A freeform string representing an in-world date, year, or range. No calendar widget or format validation — accepts anything: `1497 BCE`, `circa 1500 BCE`, `between 1700–1710`, `Year 42 of the Third Age`. Typed separately from `text` to signal intent, enabling future features like timeline views or chronological sorting. |
| `select` | `- **Field:** value` | Dropdown | Single value from a predefined list |
| `multiselect` | `- **Field:** val1, val2` | Tag picker | Multiple values from a predefined list |
| `text-list` | `- **Field:** val1, val2` | Tag-style free input | Multiple freeform text values |
| `wikilink` | `- **Field:** [[Folder/Name]]` | Search-and-select picker | Single link to another folio in the project |
| `wikilink-list` | `- **Field:** [[F/A]], [[F/B]]` | Multi search-and-select | Multiple links to other folios |

Wiki-link `target` values reference the **folder name** of the target type (see `05_Implementation_Details.md` § Wiki-Link Path Resolution).

---

## Layout Roles

Each section in the schema may optionally declare a `role` property. Roles control how the top of a folio is laid out in read mode. Everything below the role sections renders sequentially at full width.

| Role | Description |
|---|---|
| `"prose"` | The primary long-form text section. Rendered as the left column in read mode, with a drop cap. |
| `"meta"` | The primary structured fields section. Rendered as the right column in read mode. |

**Both roles are optional.** The layout adapts based on what is present and filled:

| Prose present | Meta present | Layout |
|---|---|---|
| ✓ | ✓ | Two-column: prose left (drop cap), meta right |
| ✓ | ✗ | Full-width prose only, with drop cap |
| ✗ | ✓ | Full-width structured fields, grid layout |
| ✗ | ✗ | No top block; all sections render sequentially |

Each folio type may declare **at most one section per role.** Additional `textarea` or field sections with no role render below the top block at full width.

---

## Markdown Format

### Serialization Rules

1. **Meta section is always present** — it identifies the folio type, status, and tags. The Meta block is **synthesized by the app**, not declared in the schema. Its contents are exactly: `Type`, `Status`, `Tags`. The folio ID is **not** stored in the file (see `05_Implementation_Details.md` § Folio IDs).
2. **Empty fields are omitted** — no placeholder dashes or empty values.
3. **Sections are only written if they contain at least one non-empty field.**
4. **Wiki-links use the full relative path:** `[[Characters/Arion]]`, or with a display alias: `[[Characters/Arion|Arion]]`.
5. **`textarea` / `prose` role sections** contain free prose written directly under the section header, with no bullet prefix.
6. **All other fields** use the `- **Field Name:** value` bullet format.

### Example: Full Folio File

This example is from the *Burden of the Guardian* test project. Thalirin is a mortal warrior; Ylverian is an ancient cosmic being who merges with him:

```markdown
# Thalirin

## Meta
- **Type:** Character
- **Status:** Deceased
- **Tags:** protagonist, warrior, mortal

## Basic Information
- **Sex:** Male
- **Date of Birth:** 1502 BCE
- **Date of Death:** 1449 BCE
- **Species:** [[Species/Human]]
- **Place of Origin:** [[Locations/Kea]]
- **Place of Residence:** [[Locations/Crete]]
- **Place of Death:** [[Locations/Crete]]

## Description & History
Born on the island of Kea, Thalirin was displaced as a child when Mycenaean forces invaded
and killed his father. He grew up as a refugee in a Minoan coastal city on Crete, trained
in combat by his uncle Arion. After uncovering a Mycenaean plot to destabilize the city,
he led its defense and rose to a position of leadership alongside Melina, whom he later married.

In 1453 BCE, the ancient being Ylverian merged with him to lead a counterattack against
the Mycenaeans. The fusion unleashed devastating power, but also uncontrollable fury that
led to atrocities. When Ylverian severed the connection, Thalirin was left to face the
consequences alone. His family and city collapsed in the aftermath. In 1449 BCE, consumed
by guilt, he ended his own life.

## Personality
Restless and resilient. Trauma manifested as vigilance rather than paralysis. Deeply
protective of those he loved, and prone to overreach in their defense — a mirror of
Ylverian's own fatal flaw.

## Relationships
- **Parents:** [[Characters/Lyssa]], [[Characters/Telamonas]]
- **Siblings:** [[Characters/Mira]]
- **Extended Family:** [[Characters/Leandros]], [[Characters/Arion]]
- **Friends/Allies:** [[Characters/Melina]]
- **Complicated:** [[Characters/Ylverian]]

## Connected Events
- [[Events/Mycenaean_Invasion_of_Kea]]
- [[Events/Defense_of_the_Minoan_City]]
- [[Events/Divine_Fusion]]
- [[Events/Fall_of_Crete]]

## Connected Factions
- [[Factions/Minoans]]
- [[Factions/Mycenaeans]]

## Notes
His arc is the mortal mirror of Ylverian's cosmic one. Both are guardians who destroy
what they love through the act of protecting it.
```

### Example: Minimal Folio (only filled fields)

Only filled fields are written. A minor character might look like this:

```markdown
# Telamonas

## Meta
- **Type:** Character
- **Status:** Deceased
- **Tags:** warrior

## Basic Information
- **Date of Death:** 1497 BCE
- **Species:** [[Species/Human]]
- **Place of Origin:** [[Locations/Kea]]

## Description & History
Warrior who died defending Kea during the Mycenaean invasion. Close friend of Arion,
husband of Lyssa, father of Thalirin and Mira.

## Relationships
- **Spouse:** [[Characters/Lyssa]]
- **Children:** [[Characters/Thalirin]], [[Characters/Mira]]
- **Friends/Allies:** [[Characters/Arion]]
```
