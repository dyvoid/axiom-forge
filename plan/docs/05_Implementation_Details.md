# 05 — Implementation Details

This document pins down decisions that the higher-level docs leave underspecified. **On conflict between any docs, this one wins.** It is the decisions log.

---

## Folio IDs

Folio IDs are not persisted. They are generated in-memory at project load and have no presence in `config.json` or in the `.md` files.

- On startup, the server scans the project folder, collects every folio, and assigns IDs by sorting **alphabetically by filename**. The first filename alphabetically is `1`, the next `2`, and so on.
- IDs are stable across machines (alphabetical order is deterministic) but will shift when folios are added or deleted. This is acceptable because IDs are display-only — wiki-links use folder + name, never IDs.
- On folio creation: the file is written, then the in-memory index appends the new folio with `id = currentMax + 1`. No counter file to sync.
- On folio deletion: the slot becomes a gap for the rest of the session; on next reload, IDs are recomputed and the gap closes.
- The Roman numeral form (`FOLIO XVII`) is a display-only transform computed in the UI from the integer ID.

---

## Filenames vs Display Names

- **Filename rule.** A folio's filename is its display name with spaces replaced by underscores, preserving case and Unicode characters. No slug-lowercasing, no diacritic stripping.
  - `Thalirin` → `Thalirin.md`
  - `Mycenaean Invasion of Kea` → `Mycenaean_Invasion_of_Kea.md`
- The `# Heading` inside the file is the **source of truth** for display. The filename is derived from it.
- **Renaming.** Changing the H1 in edit mode renames the file on save. The server:
  1. Computes the new filename from the new H1.
  2. If the new filename already exists in that folder → reject with `409`.
  3. Otherwise renames the file, then performs a project-wide rewrite of any `[[OldFolder/Old_Name]]` wiki-links (and aliased forms) to point at the new name.
- **Forbidden characters in display names:** `/ \ : * ? " < > |` and control chars. Reject on save with `400`.

---

## Wiki-Link Path Resolution

Wiki-links use the **folder name** of the target type, not the type key.

- The schema declares `Character` (type key) with `folder: "Characters"`.
- A wiki-link to a Character is written `[[Characters/Thalirin]]`.
- The parser resolves `[[Folder/Name]]` by finding the schema type whose `folder` matches `Folder` (case-sensitive), then locating `Folder/Name.md` on disk.
- Wiki-links never include the `.md` extension.
- In `schema.json`, `target` values on `wikilink` / `wikilink-list` fields refer to the **folder name** (matching the on-disk wiki-link form). This keeps the link picker straightforward and the file format self-describing without consulting the schema.

---

## File Watching & External Edits

The MVP does **not** watch the filesystem.

- Reads are always live (no in-memory cache beyond a per-request parse and the folio index).
- Writes use **last-write-wins** with a stat-based safety check: on `PUT`, the server compares the file's `mtime` against the `mtime` the client received with its initial `GET`. On mismatch, return `409 Conflict` and the client prompts "file changed externally — reload?".
- A future version may add `chokidar`-based push updates over SSE; out of scope for Phases 1–4.

---

## Status Semantics & "Inactive" Styling

The `inactiveWhen` array on a type definition allows flagging certain Status values as inactive. The parser reads the Meta Status block and the `projectStore` stores the status in each index record, making it available to the UI.

- Each folio type may declare an `inactiveWhen` array at the type level:
  ```json
  "Character": {
    "icon": "user",
    "folder": "Characters",
    "inactiveWhen": ["Deceased"],
    ...
  }
  ```
- Phase 3 will use this to drive visual treatment: muted wiki-link chips for inactive targets. The sidebar no longer applies italic/muted styling to inactive entries — all sidebar entries are rendered uniformly.

---

## Prose Rendering

`textarea` and `prose`-role sections are rendered as HTML, not raw text. `utils/markdown.ts` implements a lightweight block + inline renderer:

- **Inline:** `**bold**`, `__bold__` → `<strong>`; `*italic*`, `_italic_` → `<em>`; `` `code` `` → `<code>`.
- **Block:** paragraphs split on `\n\n`; lines within a block prefixed with `- `/`* ` become `<ul><li>`; lines prefixed with `\d+. ` become `<ol><li>`. Mixed blocks (e.g. a heading line followed by list items) are handled by a line-by-line accumulator.
- HTML entities are escaped before applying patterns, so user content cannot inject tags.

---

## Schema Warnings

`parseMarkdown` collects a `warnings?: string[]` on the returned `ParsedFolio`. Warnings are non-fatal: the folio is still rendered. Current checks:

- Unknown type (Meta.Type not in schema).
- Unknown section (section heading not declared in the type's schema).
- Unknown field (bullet field not declared in the section's `fields` map).
- Invalid `select`/`multiselect` value (value not in the field's `options` list).

The read view displays a warning banner below the folio header when `warnings` is non-empty.

---

## Folio Creation Flow

`POST /api/folios/:type` accepts `{ "name": "New Character" }`.

The server creates the file with **only the synthesized `## Meta` block** populated:

```markdown
# New Character

## Meta
- **Type:** Character
- **Status:**
- **Tags:**
```

- The folio's display ID is appended to the in-memory index as `currentMax + 1` for this session.
- All schema-defined sections are absent on creation (per "empty sections omitted"). They appear as empty inputs in edit mode and are written on first save with content.
- Returns `201` with the parsed folio JSON, including the assigned `id`.

---

## Validation on Save

The server validates incoming structured JSON against the schema before writing:

- Unknown sections / fields → `400` with field path.
- `select` value not in option list → `400`.
- `wikilink` / `wikilink-list` targets pointing to non-existent folios → **warning only**: the file is saved and the response includes a `brokenLinks` array. Phase 4 surfaces these visually.

---

## Out of Scope (Deferred Past Phase 4)

- Image / attachment support inside `textarea` sections.
- Multi-project switching from within the running app (currently requires restart with a new `--project` arg).
- Schema migration when `schema.json` changes after folios have been written.
- Export (PDF, static HTML site).
- Real-time multi-user editing (the app is intentionally single-user, localhost-only).
