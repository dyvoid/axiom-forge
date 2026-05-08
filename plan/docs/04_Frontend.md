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
  client.ts                          ← typed fetch wrapper, throws on non-2xx
  queries.ts                         ← useFolios, useFolio, useSearch, useBacklinks
  mutations.ts                       ← useSaveFolio, useCreateFolio, useDeleteFolio
context/
  ProjectContext.tsx                 ← config + schema, loaded once at boot, exposed via useProject()
routes/
  Landing.tsx                        ← project home: title, description, type counts, "Enter the Archive"
  FolioRead.tsx                      ← /folio/:type/:name
  FolioEdit.tsx                      ← /folio/:type/:name/edit
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
    Header.tsx
    Sidebar.tsx                      ← type list (counts), folios-of-type list, "+ New entry"
    SearchBar.tsx                    ← debounced /api/search, jumps to result on enter
  folio/
    FolioHeader.tsx                  ← eyebrow (type · folio XVII), title H1, italic subtitle, status pill, tags
    FolioReadView.tsx                ← role-driven 2-col / 1-col / grid layout dispatch
    FolioEditView.tsx                ← form built from schema sections + fields
    ProseSection.tsx                 ← drop-cap reader / textarea editor
    MetaSection.tsx                  ← right-column field grid (read mode)
    FieldSection.tsx                 ← generic full-width section (read or edit)
    BacklinksPanel.tsx               ← collapsible "▼ Backlinks (N)" at the bottom
  fields/                            ← one component per field type, mode-aware
    TextField.tsx
    TextAreaField.tsx
    DateField.tsx
    SelectField.tsx
    MultiSelectField.tsx
    TextListField.tsx
    WikiLinkField.tsx                ← search-and-pick by folder + name
    WikiLinkListField.tsx
    FieldRenderer.tsx                ← dispatches by field type, accepts mode="read"|"edit"
  chips/
    WikiLinkChip.tsx                 ← [ ◐ Lyssa ] read-mode chip
    TagChip.tsx
  ui/
    Button.tsx
    Input.tsx
    Pill.tsx
    Icon.tsx                         ← Lucide wrapper
styles/
  tokens.css                         ← generated from Axiom_Forge_Design_Tokens.md
  base.css                           ← resets, typography, body bg
  *.module.css                       ← per-component
utils/
  roman.ts                           ← integer ↔ Roman numerals (re-export from shared)
  format.ts
```

---

## Routing

| Path | Component | Notes |
|---|---|---|
| `/` | `Landing` | Project home with type counts and "Enter the Archive" CTA. |
| `/folio/:type/:name` | `FolioRead` | Read mode. `:type` is the **folder name** (matching wiki-link form). |
| `/folio/:type/:name/edit` | `FolioEdit` | Edit mode. Save returns to read mode; Discard prompts if dirty. |
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

The layout has no per-type knowledge. A new folio type with the same `role` conventions just works.

---

## Edit Mode

`FolioEditView` is a single form built from the schema. Each field renders its `mode="edit"` variant. The form holds an in-memory copy of the parsed folio JSON; on Save, it is sent to `PUT /api/folios/:type/:name` along with the original `mtime`. On Discard, if the form is dirty, a confirm dialog blocks navigation.

Field type hints (`date · freeform`, `wikilink → Locations`, etc.) are rendered by `FieldRenderer` automatically from the schema, below each label.

---

## Styling

- `tokens.css` is the only file with raw color/font/spacing values. Generated 1:1 from `docs/07_Design_Tokens.md`.
- `base.css` sets the body background, default typography, and resets.
- Every component owns a co-located `Component.module.css`. No global class names except the body and a handful of typographic primitives.
- **No Tailwind, no CSS-in-JS.** The design is print-aesthetic; utility classes would dilute the typography system, and runtime style injection is unnecessary for a localhost tool.

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
