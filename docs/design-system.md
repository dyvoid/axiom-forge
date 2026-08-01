# Design System

Axiom Forge embraces a print-aesthetic design language. It uses pure CSS Modules with a core token system—no utility frameworks like Tailwind or CSS-in-JS are used.

## Typography

Two free Google Fonts dictate the typographic hierarchy:

| Role | Family | Weights | Notes |
|---|---|---|---|
| **Display / titles** | `Cormorant Garamond` | 400, 500 (italic) | Humanist serif. Used for folio H1, subtitles, and large drop caps. |
| **Body / labels** | `Spectral` | 400, 500 (italic) | Clean serif. Default body text, smallcaps labels (eyebrows), field values. |

Spectral smallcaps labels use generous tracking (e.g. `letter-spacing: 0.18em` for section labels).

## Color Palette

The app ships with a canonical "Parchment" theme defined via CSS variables in `tokens.css`.

| Semantic Alias | Hex | Role |
|---|---|---|
| `--color-bg` | `#f3ead8` | Main canvas background (`--bg-page`) |
| `--color-surface` | `#ebe0c8` | Sidebar / top header background (`--bg-panel`) |
| `--color-border-subtle` | `#d9c8a4` | Sidebar dividers, subtle separators |
| `--color-border` | `#cdb98e` | Card borders, input borders, button outlines |
| `--color-accent` | `#9a7a2c` | `--accent-gold`: Folio-type chips, active link text |
| `--color-danger` | `#8a3522` | `--accent-rust`: Active sidebar item, "EDITING" banners, warnings |
| `--color-fg-muted` | `#6c5e46` | Labels, secondary text, eyebrow text |
| `--color-fg-secondary` | `#4a3f2e` | Sidebar item text, field values |
| `--color-fg` | `#221b13` | Folio title, body prose |

## UI & Layout Conventions

### Form Controls vs Native Elements
To preserve the print aesthetic, we eschew default browser chrome:
- **`CxSelect`**: Custom dropdown components used instead of native `<select>` tags so the dropdown panel perfectly matches the parchment background and typography.
- **Inputs**: Transparent backgrounds that darken/saturate slightly on focus, with a dashed or gold bottom border.

### Empty States & Grid Modifiers
The layout engine implements specific aesthetic rules based on content density:
1. **Empty Sections**: If a structured section (like Meta or Relationships) contains only empty fields, its header is omitted entirely from rendering.
2. **List Layouts**: Within structured sections (`MetaSection`, `FieldSection`), list-type fields (e.g. `wikilink-list`) with exactly 1 item use the compact inline 2-column layout (just like scalar fields). Only lists with >1 item render in the stacked, wrapping layout.
3. **Wikilinks**: Selected wikilink chips show a type glyph in `--color-accent` and the display name. The literal `[ ]` markdown brackets around wikilinks are intentionally omitted from the UI for a cleaner visual layout. There is no strikethrough styling for dead links (they are identified by tooltips and warnings in edit mode).

### Entry Presentation: Two Idioms

A folio appears as a compact "entry" on several surfaces. These use **two deliberate idioms**, both
rendered by `EntryContent` (ADR-0011). They are not meant to converge — they answer different
questions — but their field order and type scale are shared.

| Idiom | Variant | Used by | Question it answers |
|---|---|---|---|
| **Preview card** | `card` | Header search dropdown, Linked Mentions | "What is this thing I don't recognise?" |
| **Index line** | `row`, `inline` | Category index, Grand Index | "Where is the one I'm looking for?" |

A card is a stacked block carrying the folder eyebrow and a snippet, because entries reach you
unsorted and out of context. An index line is a single line with aligned columns and no folder
label — the index *is* the folder, and the value is scanning a known alphabetical list. Making the
index look like cards would trade away that scanability.

Field order is **name → alias → gloss** (snippet, falling back to tags), but only the card shows
the alias. An index is scanned and sorted by title, so an alias there is noise in the column the
eye is running down; the folio page and the search dropdown are where an alias earns its space.

**Every text run truncates with an ellipsis; nothing wraps.** Long titles and long alias lists
always exist, so the layout is designed for them rather than around them. A predictable ellipsis
beats rows and cards whose height changes with their content — uneven heights break the vertical
rhythm of a list far more visibly than a clipped tail breaks a single entry. Within a card the
alias yields its space before the name does, since the name is what identifies the entry.

Index column widths are **content-relative** (`clamp(9ch, 22%, 24ch)`), never a pixel width
measured against whatever titles a particular project happens to contain. `ch` tracks the type
size and the percentage tracks the viewport, so the column holds up across projects and zoom
levels. Because the width does not depend on content, rows align by construction — no subgrid and
no measurement pass.

### Undefined tokens fail the build

`var(--token)` naming a property that `tokens.css` never defines is **invalid at computed-value
time**: the declaration is dropped, or the property silently inherits. No console error, nothing a
linter or the type checker can see — the style simply does not apply.

Six of these had shipped before anyone noticed:

| Token | Damage |
|---|---|
| `--fs-small` | Flattened the whole card type scale to 16px — title, alias, folder and snippet identical |
| `--bg-hover` | Hover on Linked Mentions cards and the search-dropdown highlight did nothing at all |
| `--ff-mono` | Monospace never applied in the edit view or the warnings dialog |
| `--bg-subtle`, `--bg-surface`, `--text-danger` | Silent no-ops in dialogs and the tag filter |

`npm run lint` now runs `scripts/check-repo.mjs`, which fails if any `var(--…)` in the client has
no definition in `tokens.css`. When a token is missing, prefer an existing one — `--bg-surface`
meant `--bg-panel`, `--text-danger` meant `--accent-rust` — and only add to `tokens.css` when the
system genuinely lacks the concept, as it did for `--bg-hover` and `--ff-mono`.

Sizes come from `--fs-body-sm` (15px), `--fs-meta` (13.5px), `--fs-label` (13px), `--fs-eyebrow`
(11px) or `--fs-tiny` (10px).

### WebGL Integration
The `/` Landing route features a WebGL fragment shader drifting warm-gray smoke over parchment (ported from `prototype/webgl-hero.js`). Read mode does not display this shader.
