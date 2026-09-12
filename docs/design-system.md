# Design System

Axiom Forge embraces a print-aesthetic design language. It uses pure CSS Modules with a core token system—no utility frameworks like Tailwind or CSS-in-JS are used.

## Typography

Two free Google Fonts dictate the typographic hierarchy:

| Role | Family | Token | Weights | Notes |
|---|---|---|---|---|
| **Display / titles** | `Cormorant Garamond` | `--ff-display` | 400, 500, 600 roman; 400, 500 italic | Humanist serif. Used for page and folio titles, section headings, subtitles, preview-card titles, and large drop caps. 600 is the heaviest weight loaded — 700 triggers a faux-bold smear. |
| **Body / labels** | `Spectral` | `--ff-body` | 300, 400, 500, 600 roman; 400 italic | Clean serif. Default body text, smallcaps labels (eyebrows), field values. |

Prominent page and folio titles use the 500-weight italic display face; preview-card titles use the same face at `--fs-subtitle`. Structural section headings use the 600-weight roman display face, while dense alphabetical index entries remain roman for contrast and scanability; preview-card snippets use roman body text.

Within the folio nameplate, italic is reserved for the primary title. Aliases use 400-weight roman body type at `--fs-subtitle`, and tags step down to 300-weight roman body type at `--fs-meta`.

Spectral smallcaps labels use generous tracking (e.g. `letter-spacing: 0.18em` for field and navigation labels).

## Color Palette

The app ships with a canonical "Parchment" theme defined via CSS variables in `tokens.css`.

| Semantic Alias | Hex | Role |
|---|---|---|
| `--color-bg` | `#f3ead8` | Main canvas background (`--bg-page`) |
| `--color-surface` | `#ebe0c8` | Sidebar / top header background (`--bg-panel`) |
| `--color-border-subtle` | `#d9c8a4` | Sidebar dividers, subtle separators |
| `--color-border` | `#cdb98e` | Card borders, input borders, button outlines |
| `--color-accent` | `#9a7a2c` | `--accent-gold`: Folio-type chips, active link text. For gold used as text (e.g. selected wikilink display), use `--accent-gold-text` (`#7a5e1a`) which meets AA contrast |
| `--color-danger` | `#8a3522` | `--accent-rust`: Active sidebar item, "EDITING" banners, warnings |
| `--color-fg-muted` | `#6c5e46` | Labels, secondary text, eyebrow text |
| `--color-fg-secondary` | `#4a3f2e` | Sidebar item text, field values |
| `--color-fg` | `#221b13` | Folio title, body prose |

## UI & Layout Conventions

### Form Controls vs Native Elements
To preserve the print aesthetic, we eschew default browser chrome:
- **`CxSelect`**: Custom dropdown components used instead of native `<select>` tags so the dropdown panel perfectly matches the parchment background and typography.
- **Inputs**: Standard text inputs carry a solid `--border` outline that deepens to rust (`--accent-rust`) on focus, over a warm-translucent background that saturates further on focus. The folio title input is the one exception — no border, just a dashed bottom rule that solidifies to rust on focus.

### Empty States & Grid Modifiers
The layout engine implements specific aesthetic rules based on content density:
1. **Empty Sections**: If a structured section (like Meta or Relationships) contains only empty fields, its header is omitted entirely from rendering.
2. **List Layouts**: Full-width structured sections use a label/value ledger; list values wrap within their value column. In the narrower `MetaSection`, lists with more than one item stack below their label.
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

Field order is **name → gloss** (snippet, falling back to tags). Cards and index lines omit aliases
because they reduce the space available to the identifying title; the folio page carries the full
alias list.

Titles and single-line metadata truncate with an ellipsis. Card snippets clamp at two lines so they
can provide context without making card height unbounded. Predictable truncation keeps list and card
rhythm stable across long project content.

Cover images follow the same two idioms. On a folio, the image sits above the metadata in the
right column at its natural aspect ratio, inside a square-cornered parchment inset and one-pixel
hairline frame; it is never cropped, filtered, rounded, or shadowed. Standard Markdown alt text
becomes a centered italic caption. On preview cards, covers become small cropped thumbnails that
help identify an unfamiliar entry. Index rows and inline entries remain text-only so images do not
interrupt their alphabetical scanning rhythm. Missing images leave no placeholder; the folio's
warning callout carries the error instead.

Index column widths are **content-relative** (`clamp(9ch, 22%, 24ch)`), never a pixel width
measured against whatever titles a particular project happens to contain. `ch` tracks the type
size and the percentage tracks the viewport, so the column holds up across projects and zoom
levels. Because the width does not depend on content, rows align by construction — no subgrid and
no measurement pass.

The Grand Index's letter groups flow **column-major**: A top-to-bottom, then the next column.
An alphabetical index is scanned down a column, not across rows, so `GrandIndexView` uses CSS
multi-column (`column-width` + `break-inside: avoid` per group) rather than `flex-wrap`, which
laid groups out row-major and made the alphabetical spine zigzag. `column-fill: balance`
equalizes the column heights so the eye runs column 1 then column 2.

### Undefined tokens fail the build

`var(--token)` naming a property that `tokens.css` never defines is **invalid at computed-value
time**: the declaration is dropped, or the property silently inherits. No console error, nothing a
linter or the type checker can see — the style simply does not apply. A misspelled font-size token
flattens a whole type scale to 16px and looks deliberate.

`npm run lint` runs `scripts/check-repo.mjs`, which fails if any `var(--…)` in the client has no
definition in `tokens.css`. When a token is missing, prefer an existing one — a `--bg-surface`
usually means `--bg-panel`, a `--text-danger` means `--accent-rust` — and only add to `tokens.css`
when the system genuinely lacks the concept.

Sizes come from `--fs-body-sm` (15px), `--fs-control` (14px), `--fs-meta` (13.5px), `--fs-label`
(13px), `--fs-button` (12px), `--fs-eyebrow` (11px) or `--fs-tiny` (10px). `--fs-control` is the
edit-view control voice (menu items, chips, tag inputs); `--fs-button` is the tracked-uppercase
button label size.

### WebGL Integration
The `/` Landing route features a WebGL fragment shader: a pale cream smoke body with drifting gaps through which a warm tan background shows. Read mode does not display this shader. The shader and its tuner name the light layer the smoke, because that is what the eye reads as smoke; the dark shapes are the gaps.

Its colors and tunable values are uniforms, not literals: `packages/client/src/hero/heroParams.ts` holds the shipped values (`DEFAULT_HERO_PARAMS`), each uploaded as `u_<key>`. Opening `/?tune` loads a debug panel that edits them live, persists the edit in localStorage, and copies the result as JSON to paste back over the defaults. The shader colors are deliberately not design tokens — they are raw 0–1 RGB, and the smoke is tuned against the parchment tokens by eye.

A project's optional `theme.json` restyles a small, look-level subset of those values or disables the hero ([ADR-0001](adr/0001-project-themes.md)). `?tune` starts from that project look and can copy it back out as a `theme.json`.

### Responsive Behavior

The layout adapts across three content-driven breakpoints, defined as tokens in `tokens.css`:

| Token | Value | What happens below it |
|---|---|---|
| `--bp-stack` | `1100px` | The folio two-column (prose + meta) stacks vertically. Meta precedes prose — the quick-facts column orients the reader before the long-form history. Edit-view field rows stack label-above-value. |
| `--bp-drawer` | `900px` | The fixed sidebar lifts off the flow and becomes an overlay drawer, slid in by a hamburger button in the header. A scrim dims the page behind it; clicking the scrim or navigating closes the drawer. |
| `--bp-compact` | `600px` | The header hides the project title (logo alone is enough context). Search becomes fluid. Page padding tightens. Dialogs go full-width with stacked actions. |

Display type sizes (`--fs-hero-xl`, `--fs-hero`, `--fs-h1`, `--fs-h2`, `--fs-subtitle-lg`) are fluid via `clamp()` — they scale with the viewport instead of overflowing. Body and label sizes stay fixed; they're small enough to fit at any viewport and the hierarchy depends on the display sizes doing the scaling work.

Touch targets enlarge to `--touch-target` (44px) under `@media (pointer: coarse)`, applied to sidebar rows, icon-only buttons, chip remove buttons, and menu items. The print-aesthetic density is preserved on fine-pointer (mouse/trackpad) devices.

The viewport meta tag includes `viewport-fit=cover` for safe-area handling on notched devices. The shell uses `100dvh` (with `100vh` fallback) so mobile browser chrome doesn't cover content.
