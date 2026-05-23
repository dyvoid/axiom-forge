# 06 — Roadmap

> **Reads:** [`03_Backend.md`](03_Backend.md), [`04_Frontend.md`](04_Frontend.md).

The build is staged so each phase yields a usable app. Each phase ends with a hard checkpoint: the app must run end-to-end against a real project folder before the next phase begins.

---

## Phase 0 — Repo Scaffold

**Goal:** an empty but correctly wired monorepo that boots, lints, type-checks, and runs an empty Express + Vite shell.

### Workspace layout

```text
git/
  .editorconfig
  .gitignore
  .markdownlint.json
  LICENSE
  package.json                    # root, "private": true, npm workspaces
  tsconfig.base.json              # shared compiler options
  packages/
    shared/                       # parser, schema (zod), shared types
      package.json
      tsconfig.json
      src/
    server/                       # Express + projectStore
      package.json
      tsconfig.json
      src/index.ts                # entry, parses --project, binds 127.0.0.1
    client/                       # Vite + React + TS
      package.json
      tsconfig.json
      vite.config.ts              # /api proxy → http://127.0.0.1:<server-port>
      index.html
      src/main.tsx
  burden-of-the-guardian/         # the seed test project (not part of the build)
```

### Toolchain

- **Node:** `>=18.17` (pinned in root `package.json` `engines`). Required for stable `birthtime` cross-platform and modern ESM behaviour. Windows users on Node 18 should be fine; Linux/macOS users on Node ≤16 will be rejected.
- **Package manager:** npm 9+. No pnpm/yarn — npm workspaces are sufficient and zero-install on a fresh Node.
- **TypeScript:** 5.x, `strict: true`, `moduleResolution: "bundler"` for client/shared, `"node"` for server.
- **Lint:** ESLint with `@typescript-eslint`. Formatting is governed by `.editorconfig` only — no Prettier. Markdown is linted by `.markdownlint.json` at the repo root.
- **Test:** Vitest, co-located `*.test.ts` files. Phase 1 tests target `shared/parser.ts` round-trip.

### Root scripts

```json
{
	"scripts": {
		"dev":   "concurrently -n server,client -c yellow,cyan \"npm -w server run dev\" \"npm -w client run dev\"",
		"build": "npm -w shared run build && npm -w server run build && npm -w client run build",
		"start": "node packages/server/dist/index.js",
		"test":  "vitest run",
		"lint":  "eslint . && markdownlint-cli2 \"**/*.md\""
	}
}
```

`npm run dev` and `npm start` both accept the project flag: `-- --project <abs-path-to-project-folder>`. The flag is consumed by the server entry; the client receives nothing but the `/api` proxy.

### Phase 0 checkpoint

- `npm install` at the repo root succeeds with zero workspace warnings.
- `npm run lint` passes with no errors on the empty codebase.
- `npm run dev` boots two processes; `http://127.0.0.1:5173/` responds with the Vite shell displaying the live-fetched `config.json`, and `http://127.0.0.1:3000/api/config` and `/api/schema` return the parsed-and-validated JSON.

---

## Phase 1 — Core (MVP) ✓ Complete

**Goal:** read-only browsable encyclopedia.

- npm workspaces monorepo scaffold (`shared`, `server`, `client`).
- Express server with `--project` CLI arg and `127.0.0.1` binding.
- `shared/parser.ts` Markdown ↔ structured-data round trip.
- `shared/schema.ts` zod validation of `schema.json`.
- `projectStore`: scans folder, builds in-memory folio index with prose snippets; IDs assigned alphabetically by filename.
- API: `GET /api/config`, `GET /api/schema`, `GET /api/folios`, `GET /api/folios/:folder/:name`, `POST /api/reload`.
- Vite + React app shell with `ProjectContext`, TanStack Query, React Router.
- Sidebar: schema-driven type list with counts and Lucide icons, folios-of-type list. Active type and active folio highlighted in rust. "+ New entry" stub.
- Three index views: `Landing` (`/`), `ArchiveIndexView` (`/archive`), `CategoryIndexView` (`/folio/:folder`) with entry name and prose snippet.
- Read view: role-driven 2-col / 1-col / grid layout, drop cap.
- Prose rendering: inline markdown (bold, italic, code) and block lists rendered as HTML via `utils/markdown.ts`.
- Schema warnings: non-fatal validation on parse; warning banner shown on the folio read view.
- Wiki-link chips: clickable navigation between folios.
- Sync button in the header: triggers `POST /api/reload` then invalidates all TanStack Query caches.
- `tokens.css` generated from the design tokens doc; `base.css` typography.
- Landing route with the WebGL hero (`codex` shader, ported from `prototype/webgl-hero.js`). Static parchment fallback when WebGL is unavailable.
- Windows-compatible `open.bat` launcher that passes `--project` directly to `tsx`.

**Checkpoint:** ✓ verified
- The landing screen renders with the WebGL hero animating.
- The sidebar shows all 7 type categories with correct counts.
- Thalirin reads as a fully-populated two-column folio.
- Clicking the Lyssa, Telamonas, Crete, or Divine Fusion wiki-links navigates correctly.
- Sync button reloads the project index from disk without restarting the server.

---

## Phase 2 — Edit & Create ✓ Complete

**Goal:** the app becomes a writing tool, not just a reader.

- Edit mode with schema-driven form fields. One component per field type.
- Field-type hints below each label (`date · freeform`, `wikilink → Locations`).
- `PUT /api/folios/:folder/:name` with mtime conflict check (409 path, 5 ms NTFS-tuned slop).
- `POST /api/folios/:folder` for new folios, with H1-derived filename.
- `DELETE /api/folios/:folder/:name` with confirmation dialog (`ConfirmDialog` component, danger styling).
- **Server-side rename pipeline:** when the H1 changes on save, the server (1) writes the new file, (2) deletes the old, (3) updates the index preserving the folio id, (4) rewrites every `[[Folder/OldName]]` (with or without `|alias`) to point at the new name across every other file in the project. Response includes `renamedTo` and `linksRewritten`.
- **Save validation:** zod `ParsedFolioSchema` for structural shape + `validateAgainstSchema()` for unknown sections / unknown fields / invalid select values → 400 with machine-readable issue codes. Both helpers schema-agnostic.
- **Broken wiki-link reporting:** PUT and POST responses include a `brokenLinks` array of `{ section, field?, folder, name }` for any wikilink whose target folio does not exist. Warning only — the save still succeeds. Phase 4 surfaces these visually.
- Discard-while-dirty confirm via `window.confirm`.
- **Test suite:**
  - Parser round-trip tests against a synthetic in-memory schema covering every field type and every layout-role combination.
  - `wikilinkRewrite` unit tests (alias preservation, idempotency, regex-meta safety, partial-name immunity).
  - Server route tests via `supertest`, fixtures built per-test from a synthetic schema in `os.tmpdir()` — no coupling to any specific sample project.
  - 42 tests across 4 files, all green.

**Tech debt swept in this phase:**

- `serializeWikiLink` now emits `|alias` when present (was silently dropping it).
- Empty `Tags` line omitted on serialize when there are no tags (was writing `- **Tags:**`).
- Dedupe of inline snippet-derivation code into `ProjectStore.deriveSnippet`.
- Dead branch removed from `splitSections`.

**Checkpoint:** create, rename, edit, and delete folios entirely from the UI, with link integrity preserved across renames.

---

## Phase 3 — Search & Relations ✓ Complete

**Goal:** the lore graph becomes navigable.

Implementation order: **Stage A → Stage C → Stage B**

### Stage A — Broken-link visibility ✓ Complete

- `client/src/utils/links.ts`: schema-agnostic `isLinkResolved` / `collectUnresolvedLinks` helpers + unit tests.
- `WikiLinkChip`: dead-link styling with hover tooltip ("No folio found at …").
- `FolioEditView`: live warnings panel (gold-toned) above toolbar showing count and list of unresolved wikilink targets.

### Stage C — WikiLink Picker & Stubbing ✓ Complete

- Replace freetext wikilink inputs with a `WikiLinkPicker` combobox that filters by target folder but allows fallback for missing folios.
- Wire into `FieldEditor` for `wikilink` and `wikilink-list` field types.
- **Inline Folio Stubbing:** Add "Create" and "Create & Edit" buttons to the unresolved wikilinks warning panel on the edit view.
- **Unsaved Changes Protection:** Use React Router v6 `useBlocker` to globally intercept accidental navigation (sidebar clicks, back button) when the current edit view is dirty.

### Stage B — Search & backlinks ✓ Complete

- `GET /api/search?q=` — full-text across title, name, tags, prose snippet.
- Header search bar, debounced, with result list and keyboard navigation.
- `GET /api/folios/:folder/:name/backlinks` and the `▼ Backlinks (N)` collapsible panel on the read view.

**Checkpoint:** find any folio in under a second, see what links to what.

---

## Phase 4 — Polish

**Goal:** everyday use feels good.

- `config.json` `theme.accent` override actually applied to the UI.
- ✓ Tag filtering in the Grand Index and Category Index views (via `?tags=` URL parameters).
- ✓ UI/Layout refinements: empty wikilink brackets removed, empty sections omitted, and 1-item lists styled as inline grids.
- ✓ Tag autocomplete provided in the editor (`TextListField.tsx`).
- ✓ Keyboard navigation: arrow keys in sidebar, `/` to focus search, `e` to enter edit mode, `esc` to leave.
- Project landing screen: title, description, type counts, optional `cover.jpg`/`cover.webp` background.
- ✓ Empty-state polish (no folios of a type yet, no search results, etc.).

**Checkpoint:** the app is the canonical place to work on the project, not Obsidian.

---

## Beyond Phase 4

Tracked as deferred items in `05_Implementation_Details.md` § Out of Scope. Pull into a phase only when a concrete user need surfaces.
