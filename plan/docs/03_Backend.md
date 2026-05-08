# 03 — Backend

> **Reads:** [`01_Data_Model.md`](01_Data_Model.md), [`05_Implementation_Details.md`](05_Implementation_Details.md).

The backend is a TypeScript Express server. It loads the project folder pointed at by `--project`, builds an in-memory folio index, and exposes a small REST API consumed by the React client.

---

## Module Layout

`packages/server/src/`:

```
index.ts            ← Express bootstrap, CLI arg parsing, static client serving
projectStore.ts     ← scans folder, builds folio index, owns mtime cache and IDs
fileIO.ts           ← read/write .md, mtime checks, rename + project-wide link rewrite
validation.ts       ← per-save schema validation (zod)
routes/
  config.ts
  schema.ts
  folios.ts         ← GET, POST, PUT, DELETE
  search.ts
  backlinks.ts
```

The `shared` package supplies the parser, types, and zod schema — used identically on the server and in the client.

---

## `projectStore`

Single source of truth for server state. Owns:

- The loaded `config.json` and `schema.json` (validated with zod at load).
- The folio index: an array of records with id, type, folder, name, filePath, mtime, status, tags.
- The in-memory ID counter (see `05_Implementation_Details.md` § Folio IDs).
- A simple mtime cache used by the 409 Conflict check.

All routes go through `projectStore`. No route reads or writes files directly except via `fileIO`, which is itself called only by `projectStore`.

**Lifecycle:**

1. On boot: scan the project folder, parse every `.md` file's `## Meta` block to learn type/status/tags, sort by `birthtime` ASC (filename tiebreaker), assign IDs 1..N.
2. On `POST /api/folios/:type`: write the new file via `fileIO`, append to the index with `id = currentMax + 1`.
3. On `PUT /api/folios/:type/:name`: validate, optionally rename (delegated to `fileIO`), write, update the index entry.
4. On `DELETE`: remove file, drop the index entry. The ID slot becomes a gap until next reload.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/config` | Returns `config.json`. |
| `GET` | `/api/schema` | Returns the validated `schema.json`. |
| `GET` | `/api/folios` | Returns all folios as index records (id, type, name, status, tags). Used to populate the sidebar. |
| `GET` | `/api/folios/:type` | Returns all folios of a given type. |
| `GET` | `/api/folios/:type/:name` | Returns a single parsed folio as structured JSON. Includes `mtime` for the conflict check. |
| `PUT` | `/api/folios/:type/:name` | Saves a folio. Body includes the structured data and the `mtime` from the prior GET. Returns the new `mtime` and any `brokenLinks`. Returns `409` if the file's current `mtime` differs from the supplied one. |
| `POST` | `/api/folios/:type` | Creates a new folio with body `{ "name": "..." }`. Writes the file with only the synthesized `## Meta` block. Returns `201` with the parsed folio JSON, including the assigned `id`. |
| `DELETE` | `/api/folios/:type/:name` | Deletes a folio. |
| `GET` | `/api/search?q=` | Case-insensitive substring search across folio H1 names, all `textarea` / `prose` content, and all scalar field values plus `## Meta` tags. Wiki-link paths and aliases are excluded. Results: list of `{ type, name, snippet, matchedIn }`, name matches ranked above body matches. |
| `GET` | `/api/backlinks/:type/:name` | Returns all folios that contain a wiki-link to this folio. |

---

## Parser Logic (`shared/parser.ts`)

The parser is pure and lives in `shared` so the client can use it for live validation, broken-link detection, and word counts without round-trips. The server uses the same module.

### Reading (Markdown → Structured Data)

1. Read the `.md` file; split on `## ` headers to isolate sections.
2. Parse the `## Meta` block first to identify the folio type, status, and tags. No folio ID is read — IDs are assigned in-memory at project load.
3. Load that type's section and field definitions from the schema.
4. For each section, check the schema for its `role` and field types:
   - If `role: "prose"` or a plain `textarea`: capture all content below the header as raw prose.
   - Otherwise: parse `- **Field Name:** value` bullets.
5. For each field value, parse according to field type:
   - `wikilink`: extract path and optional alias from `[[path|alias]]`.
   - `wikilink-list`: split on `,`, parse each `[[...]]`.
   - `multiselect` / `text-list`: split on `,`.
   - All others: treat as plain string.
6. Return a structured JSON object including the resolved layout roles.

### Writing (Structured Data → Markdown)

1. Write `# Folio Name` — always first.
2. Write `## Meta` block (always present, synthesized by the app, never declared in schema). Contents in fixed order: `Type`, `Status`, `Tags`.
3. Iterate sections in **schema declaration order**, regardless of where the role-tagged sections appear:
   - Skip the section entirely if all its fields are empty.
   - Write `## Section Name`.
   - For `prose` role or plain `textarea`: write prose directly under the header.
   - For field sections: write `- **Field:** value` for each non-empty field only.
4. Serialize wiki-links as `[[Folder/Name]]`.
5. Serialize lists as comma-separated values on a single line.
6. Write the file to disk.

---

## Validation on Save

The server validates incoming structured JSON against the schema before writing:

- Unknown sections / fields → `400` with field path.
- `select` value not in option list → `400`.
- `wikilink` / `wikilink-list` targets pointing to non-existent folios → **warning only**: the file is saved and the response includes a `brokenLinks` array. Phase 4 surfaces these visually.

---

## Process Model

A single Node process. In dev, `tsx watch` reloads the server on TS changes; Vite runs separately on `:5173` and proxies `/api` to Express on `:3000`. In production, Express also serves the built client bundle from `packages/client/dist`, so `npm start -- --project /path` is the only command users need.

The server holds no other state beyond `projectStore`. There is no database, no session, no auth — it is a single-user local tool. Bind to `127.0.0.1` only.
