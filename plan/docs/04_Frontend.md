# 04 — Frontend

> **Reads:** [`01_Data_Model.md`](01_Data_Model.md), [`03_Backend.md`](03_Backend.md), [`07_Design_Tokens.md`](07_Design_Tokens.md), [`05_Implementation_Details.md`](05_Implementation_Details.md). **Reference prototype:** [`../prototype/`](../prototype/).

The client is a Vite + React + TypeScript app. It is schema-driven end-to-end: nothing in the codebase mentions `Character`, `Location`, etc. by name. Every type, section, and field is rendered by querying the schema fetched from `/api/schema`.

---

## Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | React 18 + TypeScript | Industry default, strong ecosystem, fits the schema-driven component dispatch pattern. |
| Build | Vite | Fast HMR, no SSR overhead (useless for localhost), tiny prod bundle. |
| Server state | TanStack Query | Caching, mutation flow, automatic refetch on window focus, built-in handling for the 409 mtime conflict path. Replaces ad-hoc `fetch`. |
| Routing | React Router v6 | Declarative routes for `/`, `/folio/:type/:name`, `/folio/:type/:name/edit`. |
| Validation | zod (shared with server) | Single source of truth for schema and folio shape; client-side broken-link detection without server round-trips. |
| Styling | Plain CSS + CSS Modules + `tokens.css` | The design has a curated print typography system; Tailwind would fight it. CSS Modules give scoping without a runtime cost. |
| Icons | Lucide | Monoline strokes match the etched feel; size 14×14, `stroke-width: 1.25` (see design tokens). |
| Local state | React `useState` + URL state + a `ProjectContext` | No Redux/Zustand needed — the app's state is mostly server-derived. |

---

## Directory Layout

`packages/client/src/`:

```
main.tsx
App.tsx                              ← <BrowserRouter>, <QueryClientProvider>, <ProjectProvider>
api/
  client.ts                          ← typed fetch wrapper; fetchConfig, fetchSchema, fetchFolios,
                                        fetchFolio, reloadProject
  queries.ts                         ← useFolios, useFolio
  mutations.ts                       ← (Phase 2) useSaveFolio, useCreateFolio, useDeleteFolio
context/
  ProjectContext.tsx                 ← config + schema, loaded once at boot, exposed via useProject()
routes/
  Landing.tsx                        ← project home: title, description, type counts, "Enter the Archive"
  FolioRead.tsx                      ← /folio/:folder/:name
  FolioEdit.tsx                      ← (Phase 2) /folio/:folder/:name/edit
  NotFound.tsx
hero/
  WebGLHero.tsx                      ← <canvas> + GLSL fragment shader; ported from prototype/webgl-hero.js
  shaders/
    common.glsl.ts                   ← hash + value-noise + fbm helpers
    codex.frag.glsl.ts               ← parchment + drifting smoke (the chosen variant)
    hero.vert.glsl.ts                ← fullscreen-triangle vertex shader
components/
  layout/
    AppShell.tsx                     ← header + sidebar + main slot
    TopHeader.tsx                    ← logo, project title, sync button, search input (stub)
    Sidebar.tsx                      ← type list (counts + icons), folios-of-type list, "+ New entry"
  folio/
    FolioHeader.tsx                  ← eyebrow (type · folio XVII), title H1, status pill, tags
    FolioReadView.tsx                ← role-driven 2-col / 1-col / grid layout; schema warning banner
    FolioEditView.tsx                ← (Phase 2) form built from schema sections + fields
    ProseSection.tsx                 ← drop-cap prose; renders inline markdown (bold, italic, lists)
    MetaSection.tsx                  ← right-column field grid (read mode)
    FieldSection.tsx                 ← generic full-width section (read mode)
    ArchiveIndexView.tsx             ← /archive: all types with counts, entry point from landing
    CategoryIndexView.tsx            ← /folio/:folder: all entries for a type with snippets
    BacklinksPanel.tsx               ← (Phase 3) collapsible "▼ Backlinks (N)"
  ui/
    WikiLinkChip.tsx                 ← [ ◐ Lyssa ] read-mode chip, navigates on click
    Icon.tsx                         ← Lucide wrapper (kebab-case name → PascalCase lookup)
styles/
  tokens.css                         ← generated from 07_Design_Tokens.md
  base.css                           ← resets, typography, body bg
  *.module.css                       ← per-component
utils/
  markdown.ts                        ← renderMarkdown(): inline + block markdown → HTML string
```

---

## Routing

| Path | Component | Notes |
|---|---|---|
| `/` | `Landing` | Project home with WebGL hero, type counts, and "Enter the Archive" CTA. |
| `/archive` | `GrandIndexView` | All types searchable, with tag filtering via `?tags=` |
| `/folio/:folder` | `CategoryIndexView` | All entries for a given type, searchable and tag-filterable via `?tags=` |
| `/folio/:folder/:name` | `FolioRead` | Read mode. `:folder` is the folder name (matching wiki-link form). |
| `/folio/:folder/:name/edit` | `FolioEdit` | Edit mode (Phase 2). Separate route — not a stateful host inside `FolioRead`. "↩ Back to read mode" link navigates back. |
| `*` | `NotFound` | |

Wiki-link clicks call `navigate('/folio/' + folder + '/' + name)` — no full reload. The shell stays mounted across navigations.

---

## State Strategy

- **`ProjectContext`** loads `/api/config` and `/api/schema` once at app boot and exposes them via `useProject()`. Both are effectively immutable for the session.
- **TanStack Query** owns everything else: folio list (`['folios']`), single folio (`['folio', type, name]`), search (`['search', q]`), backlinks (`['backlinks', type, name]`).
- On save: `useSaveFolio` mutates the single-folio cache optimistically, invalidates `['folios']` and `['backlinks', ...]`. On `409`, surfaces a "file changed externally — reload?" prompt that refetches the latest `mtime` and re-renders the editor with a diff banner.
- **URL is the source of truth** for which folio is open and which mode (`/edit` suffix). Refresh works correctly. Browser back/forward works.

---

## The Field-Component Pattern

Every field type is one file under `components/fields/`, exporting a component with this shape:

```ts
type FieldProps<T> = {
  schema: FieldSchema;            // from the schema.json fragment for this field
  value: T;
  onChange?: (next: T) => void;   // edit mode only
  mode: 'read' | 'edit';
};
```

`FieldRenderer.tsx` is a single switch on `schema.type` that dispatches to the right component. Adding a new field type is a one-file change plus one case in the renderer.

This is the single biggest expansion vector for the app and is treated as a public extension point. Future types like `image`, `number`, `range`, or `color` slot in without touching layout, routing, or save logic.

---

## Layout Dispatch (Read Mode)

`FolioReadView` walks the schema's sections in declared order and emits:

1. The **top block** — uses the schema's `role` declarations to pick one of four arrangements (see `01_Data_Model.md` § Layout Roles).
2. The **rest of the sections**, sequentially at full width, in declaration order.

*Layout Modifiers:*
- If a structured section (like Meta or Relationships) contains only empty fields, its header is omitted entirely from rendering.
- Within structured sections (`MetaSection`, `FieldSection`), list-type fields with exactly 1 item use the compact inline 2-column layout (like scalar fields). Only lists with >1 item render in the stacked, wrapping layout.

The layout has no per-type knowledge. A new folio type with the same `role` conventions just works.

---

## Edit Mode

Edit mode lives on a **separate route** (`/folio/:folder/:name/edit`). `FolioEdit.tsx` is a standalone route component — it is not a stateful mode toggled inside `FolioRead`. The reason: the prototype mockup shows "↩ Back to read mode" as a smallcap navigation link (not a cancel button), and the two views have sufficiently different layouts that sharing state in a host adds complexity without benefit. React Router's URL is the state.

### Layout

Single-column, `max-width: 760px`, padded `36px 72px 60px`. No two-column prose/meta split — edit mode trades the print-layout columns for a vertical form flow that puts every field at the same reading width.

### Sticky toolbar

```
position: sticky; top: -36px; z-index: 5;
margin: -36px -72px 28px;           /* bleeds to the container edge */
padding: 14px 72px;
background: rgba(243, 234, 216, 0.94);
backdrop-filter: blur(6px);
border-bottom: 1px solid var(--border);
```

Contains: `✎ Editing folio XVII` smallcap in `var(--accent-rust)` · unsaved-changes indicator (rust when dirty, muted when clean) · spacer · **Discard** ghost button · **Save folio** filled button.

Save button: `background: var(--text)` (near-black ink), `color: var(--bg-page)`, uppercase small-caps label.  
Discard button: transparent background, `border: 1px solid var(--border)`, muted color.

### Folio header (below toolbar)

Eyebrow row: type glyph + `Character · Folio XVII` on the left; `↩ Back to read mode` smallcap on the right (a `<Link>` to `/folio/:folder/:name`).

**Editable title** — a full-width `<input>` in Cormorant 88px. No visible border/background; `border-bottom: 1px dashed var(--border)`. On focus the dashed line turns rust (`var(--accent-rust)`). The title sits at the same visual weight as the H1 in read mode.

**Status / tags row** — immediately below the title:

- A `CxSelect` (custom dropdown, not native `<select>`) at `width: 160px` for the Meta Status field. Options come from the `Meta.Status` schema definition.
- `tags ·` label then a `CxFreeTagInput` (tag-chip input, Enter to commit) filling remaining width.

### Section layout

Each schema section is preceded by a `SectionHeader` — the existing `.smallcap` eyebrow from read mode (`I. Basic Information`, etc.) — followed by its content:

- **Field sections** (`role: "meta"` or plain field sections): a vertical list of `FieldRow` grids.
- **Prose sections** (`role: "prose"` or plain `textarea`): a full-width `<textarea>` with word-count / hint below-right.

### `FieldRow` grid

```
display: grid;
grid-template-columns: 170px 1fr;
gap: 16px;
padding: 8px 0;
border-bottom: 1px dotted rgba(108, 94, 70, 0.35);
```

Left cell: uppercase eyebrow label (`font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--text-muted)`) with an italic hint line below (`font-size: 10px; font-style: italic`).  
Right cell: the field control.

### Input styling (shared base)

```css
background: rgba(255, 250, 235, 0.55);
border: 1px solid var(--border);
padding: 7px 10px;
border-radius: 0;
font-family: var(--font-body);
font-size: 15px;
color: var(--text);
outline: none;
transition: border-color 120ms, background 120ms;
```

On focus: `border-color: var(--accent-rust)`, `background: rgba(255,250,235,0.9)`.  
Textareas: `min-height: 120px; resize: vertical; line-height: 1.7; font-size: 16px`.

### `CxSelect` (custom dropdown)

Not a native `<select>`. A `<button>` triggers an absolutely-positioned dropdown panel (`background: var(--bg-page); border: 1px solid var(--text-muted); box-shadow: 0 8px 28px rgba(40,30,20,0.18)`). Each option row is `padding: 8px 12px`. The selected option gets `background: rgba(138,53,34,0.08)`. Click outside closes via `mousedown` listener. This keeps the parchment aesthetic — native selects inherit OS chrome.

### Tag lists (`CxFreeTagInput`, `CxMultiSelect`)

Both render chips inside a bordered container (`border: 1px solid var(--border); background: rgba(255,250,235,0.4)`).

Chip style: `background: rgba(154,122,44,0.12); border: 1px solid rgba(154,122,44,0.4)` — gold-tinted, matching the decorative system.  
`CxFreeTagInput`: inline `<input>` at the end of the chip list, italic placeholder, Enter or comma to commit, Backspace to remove last.  
`CxMultiSelect`: same chip container but add-affordance is a `+ add` dashed-border button that opens a dropdown of remaining options.

### Wikilink chips (in picker)

Each selected wikilink chip shows: type glyph in `var(--accent-gold)` + display name in `var(--accent-rust)`. (Note: The `[ ]` square brackets around wikilinks have been intentionally omitted for a cleaner visual layout). If the linked folio has an inactive status, the name renders in `var(--text-muted)` italic.

### Footer save row

A repeat of the toolbar actions at the bottom of the form — Discard + Save folio buttons, plus unsaved-changes text on the left showing the target filename (e.g. `· unsaved changes will write to Characters/Thalirin.md`).

### Token mapping from prototype

The prototype uses legacy variable names. Canonical equivalents:

| Prototype | App token |
|---|---|
| `--oxblood` | `--accent-rust` |
| `--rule` | `--border` |
| `--rule-2` | `--border-soft` |
| `--ink` | `--text` |
| `--ink-2` | `--text-secondary` |
| `--ink-3` | `--text-muted` |
| `--paper` | `--bg-page` |
| `--paper-2` | `--bg-panel` |
| `--gold` | `--accent-gold` |
| `--serif` | `--font-serif` |
| `--body` | `--font-body` |

Field type hints (`date · freeform`, `wikilink → Locations`, etc.) are derived automatically from the field schema by `FieldTypeHint.tsx`.

---

## Styling

- `tokens.css` is the only file with raw color/font/spacing values. Generated 1:1 from `docs/07_Design_Tokens.md`.
- `base.css` sets the body background, default typography, and resets.
- Every component owns a co-located `Component.module.css`. No global class names except the body and a handful of typographic primitives.
- **No Tailwind, no CSS-in-JS.** The design is print-aesthetic; utility classes would dilute the typography system, and runtime style injection is unnecessary for a localhost tool.

---

## Landing Page

The landing route (`/`) is its own layout — no app sidebar. It has three layers, top to bottom:

- **Top chrome (optional, deferred):** small horizontal rule of metadata text. Out of scope for Phase 1; revisit only if the landing feels empty.
- **Centred title block:** project name from `config.name` (`Cormorant` italic, `--fs-hero`), thin gold rule above and below a single subtitle line composed from `config.description`, the `ENTER THE ARCHIVE →` button below.
- **WebGL hero canvas** behind everything (see next section).
- **Footer bar** pinned to the bottom of the viewport: a `1px` top border in `--border-soft`, height `--sp-7`, padded `--sp-6` horizontally, `--bg-panel` background. Three slots:

  - **Left:** the `CONTENTS` eyebrow label (Cinzel 500, `--fs-eyebrow`, `--text-muted`, `letter-spacing: 0.22em`).
  - **Centre:** the type list with counts, rendered horizontally — each entry is `<glyph> <Type> <count>` separated by `·` middle-dots. Counts come from the same source the sidebar uses (`projectStore` folio index). Each entry is a link that takes the user into the archive and pre-selects that type.
  - **Right:** a page-number numeral (`1`) in `--text-muted`, `--fs-tiny`. Decorative — anchors the print-page metaphor.

The footer is **landing-only**. It does not appear on read or edit views — there, the sidebar takes over the role of type counts.

---

## Landing-Page WebGL Hero

The landing screen has an animated background: drifting warm-gray smoke over the parchment palette. It is implemented as a single fullscreen-triangle WebGL pass with a fragment shader. There are no external WebGL libraries (no Three.js, no Regl) — raw `gl` calls only, ~50 LOC of TypeScript glue plus the shader.

**Source.** `prototype/webgl-hero.js` is the canonical reference and contains three shader variants: `codex` (chosen), `lapidary`, `penumbra`. Only `codex` is ported into the rewrite. The other two are kept in the prototype folder as alternative directions and can be revived later.

**Component contract.**

```ts
type WebGLHeroProps = {
  variant?: 'codex';                   // future: 'lapidary' | 'penumbra'
  className?: string;
};
```

`WebGLHero` mounts a `<canvas>` covering its parent (absolute, `inset: 0`), attaches a `mousemove` listener that drives the `u_mouse` uniform, runs `requestAnimationFrame`, and tears down cleanly on unmount.

**Shader anatomy** (the `codex` variant):

- A **common preamble** declares `u_res`, `u_time`, `u_mouse`, plus `hash`, `vnoise` (value noise), and 5-octave `fbm` (rotated domain).
- A **domain-warped fbm** function `smoke(p, t)` produces fluid plumes.
- The frame mixes a vertical parchment gradient (light → slightly darker) with two smoke layers at different scales/speeds.
- A `vmask` smoothstep keeps smoke at the bottom and fades it before mid-height.
- Smoke is composited as alpha-over (`mix(base, smokeCol, plume)`), not additive — so it darkens parchment instead of glowing.
- A subtle radial vignette finishes.

**Performance notes:**

- DPR is capped at 2 to avoid melting laptop GPUs at 4K (`Math.min(window.devicePixelRatio, 2)`).
- The animation loop is **prewarmed by 60 simulated seconds** at mount, so the first painted frame is mid-flow rather than a near-blank parchment.
- WebGL absence is graceful: if `getContext('webgl')` returns null, the component renders a static parchment background and logs a warning.
- The shader is heavy enough that on battery-power laptops we **pause `rAF` when the tab is hidden** (`document.visibilitychange`) and when the user navigates away from `/`.

**Where it appears.** Only on the landing route (`/`). The folio-read and folio-edit screens use the static parchment palette — adding the shader anywhere else would compete with the type for attention.

**Future toggle.** A `theme.heroVariant` field in `config.json` could later switch between `codex`, `lapidary`, and `penumbra`. Out of scope for Phases 1–4; tracked in `05_Implementation_Details.md` § Out of Scope only if explicitly requested.

---

## Build & Run

From the workspace root:

```bash
npm install                          # installs all workspaces
npm run dev -- --project /path/...   # tsx watch on server + vite dev on client, with /api proxy
npm run build                        # builds shared, then server, then client
npm start -- --project /path/...     # single Node process, serves built client from /packages/client/dist
```
