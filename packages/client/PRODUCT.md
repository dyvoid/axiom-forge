# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A solo worldbuilder — a novelist, TTRPG gamemaster, hobbyist historian, or
anyone building a personal encyclopedia of a fictional or historical world. They
work alone, on their own machine, over long sessions of reading, linking, and
revising entries. The `fall-of-troy` sample project (gods, heroes, the ten-year
war) is representative of the kind of world the tool serves.

## Product Purpose

Axiom Forge is a schema-driven, local-first encyclopedia and worldbuilding tool.
It lets a worldbuilder describe the *shape* of their world once in a
`schema.json`, then reads a folder of plain Markdown files — one entry per file —
parses structured fields out of standard Markdown headings and lists, and renders
a fast, navigable web UI for reading, linking, and editing.

Success means the worldbuilder can grow a large, interlinked world without the
content drifting out of structure, while never losing the ability to open, edit,
version, and share the raw Markdown in any other tool.

## Positioning

Most worldbuilding tools either (a) lock content inside a proprietary database,
or (b) leave the user alone with a folder of free-form notes that drift as the
world grows. Axiom Forge sits in between: a schema describes the world's types
and fields once, every Markdown file is parsed and validated against it, and
wikilinks (`[[Folder/Name]]`) are first-class. The schema gives structure; the
plain-Markdown-on-disk format gives portability. A neighboring product could not
truthfully copy this combination — schema-driven structure plus zero-lock-in
files plus first-class wikilinks — without becoming the same thing.

## Operating Context

- **Local-first, single-user.** Runs on `127.0.0.1`: an Express server on
  `:3000` reads the project folder and serves a JSON API; a Vite + React SPA on
  `:5173` consumes it. No database, no cloud, no accounts.
- **The files are the source of truth.** A project is a folder containing
  `config.json`, `schema.json`, and one subfolder per type holding `.md` files.
  Saves write back to disk via the API. The in-memory index is rebuilt on
  startup or on demand via the "Sync" button / `POST /api/reload`.
- **Obsidian compatibility is a product guarantee.** Files use YAML frontmatter
  for `type`/`tags`/`aliases` and standard Markdown headings and bullet lists for
  sections and fields. Anything Obsidian cannot read is wrong, no matter how
  convenient.
- **Git-friendly.** Plain text files invite version control; the format is
  designed to diff and merge cleanly.
- **Schema-agnostic engine.** No folio type is hardcoded in the app. The UI is
  built entirely from `schema.json`, so the same tool serves a Greek epic, a
  sci-fi setting, or a conlang lexicon.

## Capabilities and Constraints

**Shipped (core feature set, complete):**
- Read and edit views for all entry types, dispatched dynamically from the schema
- Live ranked search across titles, names, aliases, tags, and prose snippets
- Tag filtering
- Backlinks panel ("Linked Mentions")
- Broken-link detection on save (broken links are allowed to save but surface as
  warnings)
- Project-wide wikilink rewriting on entry rename (the H1 is the source of truth
  for the display name; the filename is derived from it)

**Field types:** `text`, `textarea` (prose), `date`, `select`, `multiselect`,
`text-list`, `wikilink`, `wikilink-list`. Wikilinks resolve by the target type's
*folder name*, not the type key.

**Styling constraints (durable):**
- Styling must go through the CSS variable token system (`tokens.css`) and CSS
  Modules. No utility frameworks (Tailwind), no CSS-in-JS, no inline styles that
  hardcode colors, spacing, or typography. Inline styles for dynamic computed
  values (positions, transforms, dimensions) are fine.
- Undefined `var(--token)` references fail the build via `scripts/check-repo.mjs`
  in `npm run lint`. Prefer existing tokens; add to `tokens.css` only when the
  system genuinely lacks the concept.

**State has assigned homes (durable):** Server data → TanStack Query.
Project-wide config/schema → `ProjectContext`. Local UI state →
`useState`/`useReducer`. No new global state library (Redux, Zustand, Jotai,
MobX) may be introduced.

**Distribution (undecided):** Currently self-hosted (clone, `npm install`,
`npm run dev`). ADR-0005 proposes desktop packaging via Electron and
electron-builder but is only `Proposed`. Design should not yet assume a desktop
window frame over a browser tab; the design language is web either way, since an
Electron wrapper around a web app does not make the design language native.

**Open product decisions (recorded, not resolved):**
- ADR-0004 (Bidirectional / Inverse Fields): whether the save-time prompt should
  also offer to *clear* an inverse when a link is removed, or handle additions
  only.
- ADR-0001 (Project Themes) and ADR-0002 (Multi-Project Management) are
  `Proposed` and not yet decided.

## Brand Commitments

- **Name:** Axiom Forge.
- **Voice:** The product speaks plainly and precisely. UI copy is functional, not
  playful — labels describe what the field or action is; warnings state what is
  wrong without scolding. The "axiom" / "forge" metaphor is in the name only; it
  does not leak into interface language.
- **Visual identity (incumbent, recorded as fact — DESIGN.md does not yet
  exist):** A print-aesthetic "Parchment" theme. Two free Google Fonts define the
  hierarchy — `Cormorant Garamond` (display/titles, `--ff-display`) and
  `Spectral` (body/labels, `--ff-body`). The palette is a warm parchment set
  defined in `tokens.css` (`--color-bg` `#f3ead8` through `--color-fg` `#221b13`,
  with `--color-accent` gold `#9a7a2c` and `--color-danger` rust `#8a3522`).
  Custom form controls (`CxSelect`) replace native `<select>` to preserve the
  print aesthetic. The `/` Landing route features a WebGL fragment shader
  drifting warm-gray smoke over parchment.
- **Per-project theming:** `config.json` may carry a `theme.accent` override
  (e.g. `fall-of-troy` uses `#8b6914`). Broader theming is ADR-0001, undecided.

## Evidence on Hand

- **Sample project:** `fall-of-troy/` — a working world with `config.json`,
  `schema.json`, and entries across Humans, Gods, Locations, Events, Factions,
  and Species. Exercises every field type. Two wikilinks (`Humans/Aeneas`,
  `Humans/Astyanax`) are intentionally broken to demonstrate broken-link
  detection; do not "fix" them.
- **Screenshots:** `docs/screenshots/landing.jpg`, `index.jpg`, `folio.jpg` —
  incumbent visual state of the three primary surfaces.
- **Design system doc:** `docs/design-system.md` records the incumbent tokens,
  typography, layout idioms, and the empty-state/grid rules.
- **Absences future work must not fabricate:** No real user testimonials, customer
  logos, usage metrics, or case studies exist. No branding assets beyond the
  name and the incumbent typography/palette. No accessibility audit has been
  performed.

## Product Principles

1. **The files are the source of truth, not the app.** Every capability must
   remain readable and editable as raw Markdown outside Axiom Forge. Obsidian
   compatibility is a hard floor, not a nice-to-have.
2. **Structure serves the world, not the tool.** The schema describes the world's
   shape; the engine is schema-agnostic. Never hardcode a domain assumption the
   schema is meant to own.
3. **Local-first means no lock-in.** No database, no cloud, no account, no
   proprietary format. Anything that would require the user to come back to
   Axiom Forge to read their own world is a regression.
4. **The print aesthetic is the product's identity.** Typography, parchment
   palette, and the token system are the coherent visual world; utility
   frameworks and hardcoded values fracture it. Extend the system, don't bypass
   it.
5. **Prefer the simpler solution; flag architectural expansion explicitly.** This
   is a solo-user local tool. Default to extending what exists over introducing
   a new subsystem.
