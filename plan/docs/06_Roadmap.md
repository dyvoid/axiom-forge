# 06 — Roadmap

> **Reads:** [`03_Backend.md`](03_Backend.md), [`04_Frontend.md`](04_Frontend.md).

The build is staged so each phase yields a usable app. Each phase ends with a hard checkpoint: the app must run end-to-end against a real project folder before the next phase begins.

---

## Phase 1 — Core (MVP)

**Goal:** read-only browsable encyclopedia.

- npm workspaces monorepo scaffold (`shared`, `server`, `client`).
- Express server with `--project` CLI arg and `127.0.0.1` binding.
- `shared/parser.ts` Markdown ↔ structured-data round trip with unit tests.
- `shared/schema.ts` zod validation of `schema.json`.
- `projectStore`: scans folder, builds in-memory folio index, assigns display IDs by file `birthtime`.
- API: `GET /api/config`, `GET /api/schema`, `GET /api/folios`, `GET /api/folios/:type/:name`.
- Vite + React app shell with `ProjectContext`, TanStack Query, React Router.
- Sidebar: schema-driven type list with counts, folios-of-type list, "+ New entry" stub.
- Read view: role-driven 2-col / 1-col / grid layout, drop cap.
- Wiki-link chips: clickable navigation between folios.
- `tokens.css` generated from the design tokens doc; `base.css` typography.

**Checkpoint:** open the *Burden of the Guardian* project, browse all folios, click wiki-links to navigate.

---

## Phase 2 — Edit & Create

**Goal:** the app becomes a writing tool, not just a reader.

- Edit mode with schema-driven form fields. One component per field type.
- Field-type hints below each label (`date · freeform`, `wikilink → Locations`).
- `PUT /api/folios/:type/:name` with mtime conflict check (409 path).
- `POST /api/folios/:type` for new folios, with H1-derived filename.
- `DELETE /api/folios/:type/:name` with confirmation dialog.
- Server-side rename + project-wide wiki-link rewrite when H1 changes.
- Save validation (zod): unknown fields/sections → 400; broken wiki-links → warning array.
- Discard-while-dirty confirm dialog.

**Checkpoint:** create, rename, edit, and delete folios entirely from the UI.

---

## Phase 3 — Search & Relations

**Goal:** the lore graph becomes navigable.

- `GET /api/search?q=` with the scope defined in `03_Backend.md`.
- Header search bar, debounced, with result list and keyboard navigation.
- `GET /api/backlinks/:type/:name` and the `▼ Backlinks (N)` collapsible panel.
- Status semantics: `inactive: true` options drive italic-in-sidebar / muted-in-chips styling.

**Checkpoint:** find any folio in under a second, see what links to what.

---

## Phase 4 — Polish

**Goal:** everyday use feels good.

- `config.json` `theme.accent` override actually applied to the UI.
- Tag filtering in the sidebar.
- Keyboard navigation: arrow keys in sidebar, `/` to focus search, `e` to enter edit mode, `esc` to leave.
- Broken wiki-link detection: links to non-existent folios flagged visually in both read and edit modes.
- Project landing screen: title, description, type counts, optional `cover.jpg`/`cover.webp` background.
- Empty-state polish (no folios of a type yet, no search results, etc.).

**Checkpoint:** the app is the canonical place to work on the project, not Obsidian.

---

## Beyond Phase 4

Tracked as deferred items in `05_Implementation_Details.md` § Out of Scope. Pull into a phase only when a concrete user need surfaces.
