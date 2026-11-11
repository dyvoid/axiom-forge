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

The backend is a lightweight Node.js/Express server that runs on `127.0.0.1`. Every request passes `localOnly` first, which refuses any `Host` that is not a loopback name and any non-loopback `Origin`, so a website open in the same browser cannot reach the API by DNS rebinding or a cross-site post.

### `ProjectRegistry` (the project list)
The server knows about any number of projects and has exactly one open, the *active* project
([ADR-0023](adr/0023-project-registry-and-active-project.md)).
- The list is a JSON file of folder paths, `projects.json`, in `~/.axiom-forge/` or the folder
  named by `AXIOM_FORGE_HOME`. Nothing is stored in a project about other projects.
- At startup it opens the `--project` path if one was given (adding it to the list when new),
  otherwise the project that was open last, otherwise, on a first run, the bundled sample. A
  project that fails to load does not stop the server: it starts with none open.
- Opening a project builds a new `ProjectStore` and swaps it in only once fully loaded.
- The endpoints below serve the active project. With none open they answer `409 no-project`. A
  request may name the project it expects in `X-Axiom-Project`; when that is not the active one
  the answer is `409 project-changed`.

### `projectStore` (In-Memory Index)
Because the app does not watch the filesystem (no `chokidar`), it relies on a live in-memory index built on startup.
- Scans the folder, reads all `.md` files, and validates them via `shared/parser.ts`.
- Folio IDs are not persisted to disk. They are assigned alphabetically by filename at boot.
- Caches a small `snippet` of prose for fast searching.

### API Endpoints
The server exposes the following REST API:
- `GET /api/config` - Returns `config.json`
- `GET /api/schema` - Returns the validated `schema.json`
- `GET /api/theme` - Returns the validated optional `theme.json`, or `{}` when the project has none
- `GET /api/folios` - Returns the full folio index (sidebar & index views)
- `GET /api/folios/:folder/:name` - Returns a single parsed folio as structured JSON
- `GET /api/search?q=` - Ranked search across titles, names, aliases, tags, and prose snippets
- `GET /api/folios/:folder/:name/backlinks` - Returns folios linking to this target
- `GET /api/folios/:folder/:name/image` - Resolves and serves the folio's cover embed with a strict image content type
- `PUT /api/folios/:folder/:name/image?filename=` - Uploads an allowed image (maximum 10 MB) to the project `Images/` folder and returns its collision-safe vault path
- `DELETE /api/folios/:folder/:name/image` - Deletes the image referenced by the folio's current cover embed
- `GET /api/warnings` - Returns all parse warnings, grouped by file; `theme.json` problems are an entry with an empty `folder`
- `POST /api/reload` - Rebuilds the in-memory index from disk and re-reads config, schema and theme. Waits for any in-flight save, and swaps the new state in only once all of it has loaded, so a failed reload (`500`) leaves the previous project serving
- `POST /api/folios/:folder` - Creates a new folio
- `PUT /api/folios/:folder/:name` - Saves (and optionally renames) a folio. Validates `mtime` to prevent edit conflicts; on rename, atomically moves the file and rewrites every `[[Folder/Old_Name]]` wikilink across the project.
- `DELETE /api/folios/:folder/:name?deleteCoverImage=` - Deletes a folio and optionally its referenced cover image

The project list has its own endpoints. Each answers with the whole list, `{ activeId, projects }`:
- `GET /api/projects` - Every known project and which is open. A project whose folder is gone or whose `config.json` is unreadable is listed with `available: false`
- `POST /api/projects` - Body `{ path, create? }`. Adds a folder and opens it. `404 not-a-project` (with `canCreate`) when it holds no project; with `create: { name, description? }` a new project is started there first. `422 invalid-project` when it will not load, and nothing is added
- `POST /api/projects/:id/activate` - Opens a listed project. On `422` the previous project stays open
- `PATCH /api/projects/:id` - Body `{ name, description?, version? }`. Rewrites that project's `config.json`, keeping unmanaged keys
- `DELETE /api/projects/:id?deleteFiles=&confirmName=` - Takes a project off the list. With `deleteFiles=true` and its name in `confirmName`, also deletes the folder; refused for a folder that is no longer a project, or that contains the home folder or the server itself

### Rename & Link Rewriting
If a folio's frontmatter `title` changes during an edit, the server computes the new filename. After renaming the file, it automatically rewrites any `[[Folder/Old_Name]]` wikilinks across the entire project to prevent dead links.

## Frontend Client (`packages/client`)

The frontend is a single-page React application powered by Vite. In development mode, Vite runs on `:5273` and proxies `/api` to the Express server on `:3000`.

### State Management
- **`ProjectContext`**: Gates every route that shows a project's contents. It waits for the project list, redirects to `/projects` when no project is open, then fetches `/api/config` and `/api/schema` through TanStack Query with no staleness timer, so they load once and refetch only when the header "Sync" button invalidates every query after a reload.
- **The window's project**: `api/client.ts` remembers which project this window is showing and sends it as `X-Axiom-Project` on every request. Query keys carry no project id; moving to another project clears the cache (`adoptLibrary`). When another window switches project, `ProjectDrift` leaves this window's content in place and asks whether to reopen its project or follow.
- **TanStack Query**: Manages all dynamic server state: folio lists, individual reads, search results, and backlinks. The theme is also a query, used only by `Landing` and deliberately outside `ProjectContext`'s loading gate, since a theme must never hold up the app. It caches data heavily and invalidates on save or via the header "Sync" button.

### Routing
The UI handles routing entirely client-side using React Router:
- `/projects` (`Projects`) - The project list: open, add or start, edit settings, remove. Outside the project gate, so it is also what shows when no project is open.
- `/open/:id` (`ProjectOpen`) - Opens that project, then redirects to `/`. A route so that switching passes through the router: an editor with unsaved changes asks first, and a project that fails to load has a page to say why.
- `/` (`Landing`) - Project home with WebGL hero and type counts.
- `/index` (`GrandIndexView`) - Global search and tag filtering for all folios.
- `/folio/:folder` (`CategoryIndexView`) - Category-specific index with search/tags.
- `/folio/:folder/:name` (`FolioRead`) - Read mode.
- `/folio/:folder/:name/edit` (`FolioEdit`) - Edit mode (separate route, not a nested state, allowing distinct layouts).
- `/new/:folder?title=` (`FolioNew`) - Editor for an unsaved draft; nothing is written until Save. Kept off `/folio/:folder/*` so it cannot collide with a folio named `new`.

### Read Mode Layout Dispatch
The layout engine does not hardcode folio types. Instead, `FolioReadView` dynamically builds the page based on the `schema.json`.
1. The **Top Block** looks for schema sections tagged with `role: "meta"` and `role: "prose"` to construct the two-column grid (or full-width variants if one is missing).
2. The **Rest of the sections** render sequentially below the top block in declaration order.
3. Empty sections (sections with no filled fields) are entirely omitted from the render pass.
