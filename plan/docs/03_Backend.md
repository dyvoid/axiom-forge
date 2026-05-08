# 03 — Backend

> **Reads:** [`01_Data_Model.md`](01_Data_Model.md), [`05_Implementation_Details.md`](05_Implementation_Details.md).

The backend is a TypeScript Express server. It loads the project folder pointed at by `--project`, builds an in-memory folio index, and exposes a small REST API consumed by the React client.

---

## Module Layout

`packages/server/src/`:

```
index.ts            ← Express bootstrap, CLI arg parsing, static client serving
projectStore.ts     ← scans folder, builds folio index, owns snippet cache and IDs
fileIO.ts           ← read/write .md, mtime checks, rename + project-wide link rewrite
routes/
  index.ts          ← mounts all routers + POST /api/reload
  config.ts
  schema.ts
  folios.ts         ← GET (read-only in Phase 1; POST, PUT, DELETE added in Phase 2)
```

Phase 2 adds `validation.ts`, `routes/search.ts`, and `routes/backlinks.ts`.

The `shared` package supplies the parser, types, and zod schema — used identically on the server and in the client.

---

## `projectStore`

Single source of truth for server state. Owns:

- The loaded `config.json` and `schema.json` (validated with zod at load).
- The folio index: an array of records with id, type, folder, name, filePath, mtime, status, tags, and a cached `snippet` (first ~120 chars of the prose section, extracted at index build time).
- The in-memory ID counter (see `05_Implementation_Details.md` § Folio IDs).

All routes go through `projectStore`. No route reads or writes files directly except via `fileIO`, which is itself called only by `projectStore`.

**Lifecycle:**

1. On boot: scan the project folder, parse every `.md` file fully to extract type/status/tags and the prose snippet, sort alphabetically by filename, assign IDs 1..N.
2. On `POST /api/reload`: re-run the full scan and rebuild the index from disk (used by the client sync button).
3. *(Phase 2)* On `POST /api/folios/:type`: write the new file via `fileIO`, append to the index with `id = currentMax + 1`.
4. *(Phase 2)* On `PUT /api/folios/:type/:name`: validate, optionally rename (delegated to `fileIO`), write, update the index entry.
5. *(Phase 2)* On `DELETE`: remove file, drop the index entry. The ID slot becomes a gap until next reload.

---

## API Endpoints

**Phase 1 (implemented):**

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/config` | Returns `config.json`. |
| `GET` | `/api/schema` | Returns the validated `schema.json`. |
| `GET` | `/api/folios` | Returns all folios as index records (id, type, folder, name, status, tags, snippet). Used to populate the sidebar and index views. |
| `GET` | `/api/folios/:folder/:name` | Returns a single parsed folio as structured JSON, including `mtime` and `warnings`. |
| `POST` | `/api/reload` | Re-scans the project folder and rebuilds the folio index from disk. Used by the client sync button. |

**Phase 2 (planned):**

| Method | Endpoint | Description |
|---|---|---|
| `PUT` | `/api/folios/:folder/:name` | Saves a folio. Body includes the structured data and the `mtime` from the prior GET. Returns the new `mtime` and any `brokenLinks`. Returns `409` if the file's current `mtime` differs from the supplied one. |
| `POST` | `/api/folios/:folder` | Creates a new folio with body `{ "name": "..." }`. Returns `201` with the parsed folio JSON. |
| `DELETE` | `/api/folios/:folder/:name` | Deletes a folio. |

**Phase 3 (planned):**

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/search?q=` | Case-insensitive substring search across folio names, prose content, and scalar field values. Results: list of `{ type, name, snippet, matchedIn }`, name matches ranked above body matches. |
| `GET` | `/api/backlinks/:folder/:name` | Returns all folios that contain a wiki-link to this folio. |

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
