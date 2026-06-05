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

### WebGL Integration
The `/` Landing route features a WebGL fragment shader drifting warm-gray smoke over parchment (ported from `prototype/webgl-hero.js`). Read mode does not display this shader.
