# Axiom Forge — Build Plan

**Axiom Forge** is a local web application for writers and world-builders. It serves as an authoritative world bible — a structured, searchable encyclopedia for any creative project: fantasy novels, sci-fi settings, historical fiction, tabletop RPG campaigns, or anything else requiring a large body of interconnected lore.

It reads a folder of structured Markdown files as its database, renders them as a browsable encyclopedia, and allows in-app editing. The Markdown files are simultaneously valid Obsidian documents, so the same files can be opened and edited in Obsidian without any conversion.

**First test project:** *Burden of the Guardian*, a Bronze Age epic fantasy novel with a Minoan/Mycenaean setting and a mythological layer involving ancient cosmic beings. Its folio types (Characters, Species, Locations, Events, Factions, Lore, Timeline) serve as the reference implementation for this build plan.

---

## Stack

- **Frontend:** Vite + React 18 + TypeScript, TanStack Query, React Router, plain CSS + CSS Modules driven by `Axiom_Forge_Design_Tokens.md`.
- **Backend:** Node.js + Express + TypeScript, runs on `localhost`. No external database — the project folder *is* the database.
- **Shared:** zod schemas and the Markdown parser live in a `shared` package, used by both server and client.
- **Tooling:** npm workspaces monorepo, single `npm start -- --project /path` command serves the built client from Express in production.

---

## Terminology

| Term | Meaning |
|---|---|
| **Project** | A world — a folder containing a `config.json`, `schema.json`, and subfolders of folios |
| **Folio** | A single encyclopedia entry (a character, location, event, etc.) — stored as one `.md` file |
| **Folio type** | A category of folio defined in the schema (e.g. Character, Location) |
| **Folio ID** | An integer assigned to each folio at project load time, displayed as e.g. `FOLIO XVII`. Generated in-memory by sorting folios by file creation time — not persisted, not stored in the file, not part of the filename, not used for linking. Display-only. |
| **Schema** | The `schema.json` file that defines all folio types, sections, and fields for a project |

---

## Core Design Principles

- **Schema-driven:** The app has no hardcoded folio types. Every type, section, and field is defined in a `schema.json` file that lives in the project folder. A new project = a new schema = a completely different set of folio types, with no code changes. However, the schema must follow certain layout conventions (see Layout Roles in the data model doc) to support the two-column read view.
- **Markdown as storage:** All data lives in `.md` files that are human-readable without the app. The app is a lens, not a lock-in.
- **Obsidian-compatible:** Wiki-link syntax (`[[Folder/Name]]`) is used throughout, matching Obsidian's format so files work in both tools.
- **Empty fields omitted:** Markdown files only contain sections and fields that have content. No empty headers or placeholder dashes.

---

## Repository Layout

```
/axiom-forge/                        ← app source code (npm workspaces monorepo)
  package.json                       ← workspace root: dev, build, start scripts
  tsconfig.base.json
  /packages
    /shared/                         ← types, parser, schema validation
      /src
        types.ts
        parser.ts                    ← Markdown ↔ structured data (pure, no fs)
        schema.ts                    ← zod validation
        wikilink.ts
        roman.ts
    /server/                         ← Express + projectStore + routes
      /src
        index.ts
        projectStore.ts
        fileIO.ts
        validation.ts
        routes/
    /client/                         ← Vite + React app
      index.html
      /src
        main.tsx
        App.tsx
        api/
        context/
        routes/                      ← Landing, FolioRead, FolioEdit
        components/
          layout/                    ← AppShell, Sidebar, Header, SearchBar
          folio/                     ← FolioHeader, FolioReadView, FolioEditView, ...
          fields/                    ← one component per field type
          chips/
          ui/
        styles/
          tokens.css                 ← from Axiom_Forge_Design_Tokens.md
          base.css

/my-project/                         ← the project folder (separate, pointed to by the app)
  config.json                        ← project identity and UI preferences
  schema.json                        ← folio types, fields, and field types
  /Characters/
  /Species/
  /Locations/
  /Events/
  /Factions/
  /Lore/
  /Timeline/
```

The app is started with a path argument pointing to the project folder:

```bash
npm start -- --project /path/to/my-project
```

Dev mode runs Vite on `:5173` proxying `/api` to Express on `:3000`. Production mode is a single Node process serving the built client bundle.

The app and the project folder are intentionally separate. One installation of Axiom Forge can serve any number of projects.

---

## Documentation Map

This plan is split across focused documents. Read them in this order if you're new:

| # | Doc | What's in it |
|---|---|---|
| 1 | [`docs/01_Data_Model.md`](docs/01_Data_Model.md) | `config.json`, `schema.json`, field types, layout roles, Markdown serialization rules with examples |
| 2 | [`docs/02_Reference_Schema.md`](docs/02_Reference_Schema.md) | The full *Burden of the Guardian* schema (Character, Species, Location, Event, Faction, Lore, Timeline) |
| 3 | [`docs/03_Backend.md`](docs/03_Backend.md) | Express server, `projectStore`, API endpoints, parser logic, save validation |
| 4 | [`docs/04_Frontend.md`](docs/04_Frontend.md) | React app structure, component tree, routing, state strategy, field-component pattern |
| 5 | [`docs/05_Implementation_Details.md`](docs/05_Implementation_Details.md) | Cross-cutting decisions: folio IDs, filenames, wiki-link resolution, status semantics, file watching, deferred items |
| 6 | [`docs/06_Roadmap.md`](docs/06_Roadmap.md) | Development phases |
| 7 | [`docs/07_Design_Tokens.md`](docs/07_Design_Tokens.md) | Typography, palette, spacing, component recipes |
| — | [`design/`](design/) | PNG mockups and Figma HTML exports |
| — | [`prototype/`](prototype/) | The original Claude Design React prototype: shader code (`webgl-hero.js`), `codex.jsx` (landing + read), `codex-edit.jsx`, `shared.jsx` (sample data, type glyphs, link parser). Reference-only; the rewrite re-implements these in TypeScript, but the shader and the sample data are direct ports. |
| — | [`../burden-of-the-guardian/`](../burden-of-the-guardian/) | The seed test project — `config.json`, `schema.json`, and 16 folios across all 7 types. Point the app at this folder on day one to verify Phase 1 end-to-end. |

On conflict between docs, **`05_Implementation_Details.md` wins.** It's the decisions log.
