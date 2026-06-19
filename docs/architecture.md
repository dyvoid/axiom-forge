# System Architecture

The Axiom Forge application is a locally-hosted, single-user tool composed of a Vite/React frontend and a TypeScript Express backend. It operates directly on local markdown files, with no database.

## Monorepo Structure

The project uses npm workspaces to manage three packages:

```text
packages/
  shared/     # Zod schemas, typescript interfaces, parser logic
  server/     # Express server + projectStore
  client/     # Vite + React + TS
```

## Backend Services (`packages/server`)

The backend is a lightweight Node.js/Express server that runs on `127.0.0.1`. It accepts a `--project` CLI argument pointing to the target markdown directory.

### `projectStore` (In-Memory Index)
Because the app does not watch the filesystem (no `chokidar`), it relies on a live in-memory index built on startup.
- Scans the folder, reads all `.md` files, and validates them via `shared/parser.ts`.
- Folio IDs are not persisted to disk. They are assigned alphabetically by filename at boot.
- Caches a small `snippet` of prose for fast searching.

### API Endpoints
The server exposes the following REST API:
- `GET /api/config` - Returns `config.json`
- `GET /api/schema` - Returns the validated `schema.json`
- `GET /api/folios` - Returns the full folio index (sidebar & index views)
- `GET /api/folios/:folder/:name` - Returns a single parsed folio as structured JSON
- `GET /api/search?q=` - Ranked search across titles, names, aliases, tags, and prose snippets
- `GET /api/folios/:folder/:name/backlinks` - Returns folios linking to this target
- `GET /api/warnings` - Returns all parse warnings, grouped by folio
- `POST /api/reload` - Rebuilds the in-memory index from disk and re-reads config + schema
- `POST /api/folios/:folder` - Creates a new folio
- `PUT /api/folios/:folder/:name` - Saves (and optionally renames) a folio. Validates `mtime` to prevent edit conflicts; on rename, atomically moves the file and rewrites every `[[Folder/Old_Name]]` wikilink across the project.
- `DELETE /api/folios/:folder/:name` - Deletes a folio

### Rename & Link Rewriting
If a folio's H1 title changes during an edit, the server computes the new filename. After renaming the file, it automatically rewrites any `[[Folder/Old_Name]]` wikilinks across the entire project to prevent dead links.

## Frontend Client (`packages/client`)

The frontend is a single-page React application powered by Vite. In development mode, Vite runs on `:5173` and proxies `/api` to the Express server on `:3000`.

### State Management
- **`ProjectContext`**: Fetches `/api/config` and `/api/schema` once at boot. These are effectively immutable for the session.
- **TanStack Query**: Manages all dynamic server state: folio lists, individual reads, search results, and backlinks. It caches data heavily and invalidates on save or via the header "Sync" button.

### Routing
The UI handles routing entirely client-side using React Router:
- `/` (`Landing`) - Project home with WebGL hero and type counts.
- `/archive` (`GrandIndexView`) - Global search and tag filtering for all folios.
- `/folio/:folder` (`CategoryIndexView`) - Category-specific index with search/tags.
- `/folio/:folder/:name` (`FolioRead`) - Read mode.
- `/folio/:folder/:name/edit` (`FolioEdit`) - Edit mode (separate route, not a nested state, allowing distinct layouts).

### Read Mode Layout Dispatch
The layout engine does not hardcode folio types. Instead, `FolioReadView` dynamically builds the page based on the `schema.json`.
1. The **Top Block** looks for schema sections tagged with `role: "meta"` and `role: "prose"` to construct the two-column grid (or full-width variants if one is missing).
2. The **Rest of the sections** render sequentially below the top block in declaration order.
3. Empty sections (sections with no filled fields) are entirely omitted from the render pass.
