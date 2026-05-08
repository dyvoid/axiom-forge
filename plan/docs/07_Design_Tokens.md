# 07 — Design Tokens

> **Reads:** [`04_Frontend.md`](04_Frontend.md). **Source material:** [`../design/`](../design/) (PNG mockups, Figma HTML), [`../prototype/`](../prototype/) (React + WebGL prototype).

Extracted from the Figma prototype HTML exports and cross-referenced with the PNG mockups. Use these as the canonical values for the rewrite. The prototype HTML itself is **not** intended for code reuse — it is a Figma dump with embedded base64 fonts and absolutely-positioned div soup.

---

## Typography

Two typefaces, both Google Fonts, free, OFL.

| Role | Family | Weights used | Notes |
|---|---|---|---|
| **Display / labels** | `Cinzel` | 400, 500, 600, 700 | Roman-inscription serif. Used for ALL CAPS section labels, folio-type pills, sidebar group headers, the "EDITING FOLIO XVII" banner. |
| **Body / titles** | `Cormorant Garamond` | 400, 500 (regular + italic) | Humanist serif. Used for folio H1, body prose, italic subtitles, and field values. |

**Loading.** In production, link from Google Fonts:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400;1,500&display=swap" rel="stylesheet">
```

For an offline-first local app, self-host the four `.woff2` files under `/public/fonts/`.

### Type Scale (extracted size frequencies)

| Token | px | Use |
|---|---|---|
| `--fs-hero` | 88 | Landing-page project title (`Burden of the Guardian`) |
| `--fs-h1` | 64 | Folio title (`Thalirin`) |
| `--fs-h2` | 22 | Section reserved (currently unused; available for sub-headings) |
| `--fs-subtitle` | 18 | Folio italic subtitle (`of Kea, the mortal vessel of Ylverian`) |
| `--fs-body-lg` | 17 | Drop-cap prose first paragraph |
| `--fs-body` | 16 | Default body text |
| `--fs-body-sm` | 15 | Secondary body, sidebar entries |
| `--fs-meta` | 13.5 | Field values, tag chips |
| `--fs-label` | 13 | Field labels |
| `--fs-eyebrow` | 11 | ALL-CAPS labels (`CHARACTER · FOLIO XVII`, `INDEX`, `BASIC INFORMATION`) |
| `--fs-tiny` | 10 | Footer page numbers, hint text below labels |

### Letter Spacing

Cinzel ALL CAPS labels use generous tracking. Approximate values:

- Eyebrow / section labels: `letter-spacing: 0.18em`
- Sidebar group headers: `letter-spacing: 0.22em`
- Buttons (`SAVE FOLIO`, `ENTER THE ARCHIVE`): `letter-spacing: 0.2em`

Cormorant body text: default tracking (no override).

### Line Heights

- Body prose: `1.65`
- Folio H1: `1.05`
- Subtitle / italic: `1.4`
- Eyebrow labels: `1.0`

---

## Color Palette

All colors extracted from the Figma export's computed styles. Counts indicate usage frequency in the read-mode page.

### Palette

| Token | Hex | RGB | Role |
|---|---|---|---|
| `--bg-page` | `#f3ead8` | 243, 234, 216 | Main canvas background |
| `--bg-panel` | `#ebe0c8` | 235, 224, 200 | Sidebar / muted panels |
| `--border-soft` | `#d9c8a4` | 217, 200, 164 | Sidebar dividers, subtle separators |
| `--border` | `#cdb98e` | 205, 185, 142 | Card borders, input borders, button outlines |
| `--accent-gold` | `#9a7a2c` | 154, 122, 44 | Folio-type chip color, count numbers, gold rule between columns, link chip text |
| `--accent-rust` | `#8a3522` | 138, 53, 34 | Active sidebar item, "EDITING" banner, destructive emphasis |
| `--text-muted` | `#6c5e46` | 108, 94, 70 | Labels, secondary text, eyebrow text (most-used color) |
| `--text-secondary` | `#4a3f2e` | 74, 63, 46 | Sidebar item text, field values |
| `--text-primary` | `#221b13` | 34, 27, 19 | Folio title, body prose |
| `--shadow` | `rgba(0,0,0,0.18)` | — | Card / button drop shadow |

### Semantic Aliases

```css
:root {
  /* surfaces */
  --color-bg: var(--bg-page);
  --color-surface: var(--bg-panel);

  /* text */
  --color-fg: var(--text-primary);
  --color-fg-secondary: var(--text-secondary);
  --color-fg-muted: var(--text-muted);

  /* accents */
  --color-accent: var(--accent-gold);     /* override via config.json theme.accent */
  --color-danger: var(--accent-rust);     /* edit-mode warnings, delete confirm */

  /* lines */
  --color-border: var(--border);
  --color-border-subtle: var(--border-soft);
}
```

### Status / Link States

- **Active sidebar entry:** `color: var(--accent-rust)`, with a 2px left border in the same color.
- **Inactive folio (deceased / dissolved / destroyed):** italic, `color: var(--text-muted)`.
- **Wiki-link chip:** `color: var(--accent-gold)`, framed in `[ ]` brackets in body text, no underline.
- **Hover on link chip:** brightens to `var(--accent-rust)`.

---

## Spacing & Layout

### Container

- **Page max width:** 1280px, centered.
- **Sidebar width:** 240px (fixed).
- **Folio reading column:** ~640px max for prose, ~280px for the meta column. Two-column gap: 48px.
- **Outer page padding:** 32px horizontal at desktop, 16px at narrow widths.

### Spacing Scale

Use a 4px base. Common values observed:

| Token | px |
|---|---|
| `--sp-1` | 4 |
| `--sp-2` | 8 |
| `--sp-3` | 12 |
| `--sp-4` | 16 |
| `--sp-5` | 24 |
| `--sp-6` | 32 |
| `--sp-7` | 48 |
| `--sp-8` | 64 |

### Borders & Rules

- Hairline rules: `1px solid var(--border-soft)`.
- Section dividers under section labels: `1px solid var(--border)`.
- Gold accent rules (under hero, between columns): `1px solid var(--accent-gold)`, sometimes faded with `opacity: 0.6`.
- Border radius: **0** for all containers and cards. Buttons and chips have `2px` (almost imperceptible). The aesthetic is print-page, not web-card.

### Shadows

Used sparingly. Only on the primary CTA (`SAVE FOLIO`, `ENTER THE ARCHIVE`):

```css
box-shadow: 0 1px 2px rgba(0,0,0,0.18);
```

---

## Components

### Drop Cap (Description & History)

```css
.prose-drop-cap::first-letter {
  font-family: 'Cormorant Garamond', serif;
  font-weight: 500;
  font-size: 5.5em;
  line-height: 0.85;
  float: left;
  padding: 0.05em 0.12em 0 0;
  color: var(--text-primary);
}
```

### Folio-Type Eyebrow (e.g. `◐ CHARACTER · FOLIO XVII`)

- Font: Cinzel 500, `--fs-eyebrow`, `letter-spacing: 0.18em`.
- Color: `var(--accent-gold)`.
- Icon glyph at left, separated by a thin space then `·` between segments.

### Tag Chips (in `## Meta`)

- Cormorant italic, `--fs-meta`, `var(--text-muted)`.
- Separated by `·` (middle dot) with a thin space on each side.

### Wiki-Link Chip (read mode)

```text
[ ◐ Lyssa ]
```

- Brackets are literal text characters, in `var(--text-muted)`.
- Inner content: small folio-type glyph + name, in `var(--accent-gold)`.
- Cursor: pointer. No underline.

### Wiki-Link Token (edit mode)

- Pill with 1px border in `var(--border)`, 4px horizontal padding, 2px vertical.
- Inner: glyph + name in `var(--accent-gold)`, then a `×` remove handle in `var(--text-muted)`.

### Buttons

| Variant | BG | Border | Text |
|---|---|---|---|
| Primary (`SAVE FOLIO`) | `var(--text-primary)` | none | `var(--bg-page)` |
| Secondary (`DISCARD`, `ENTER THE ARCHIVE`) | transparent | `1px solid var(--border)` | `var(--text-primary)` |

All buttons: Cinzel 500, `--fs-eyebrow`, `letter-spacing: 0.2em`, padding `12px 24px`.

### Inputs (edit mode)

- Background: `var(--bg-page)` (slightly brighter than the form area's `var(--bg-panel)`).
- Border: `1px solid var(--border)`.
- Focus: border becomes `var(--accent-gold)`, no extra outline.
- Padding: `8px 12px`.
- Font: Cormorant 400, `--fs-body`.

### Sidebar Index

- Group header (`INDEX`, `CHARACTERS`): Cinzel 500, `--fs-eyebrow`, `var(--text-muted)`, `letter-spacing: 0.22em`, margin-bottom 12px.
- Folio-type rows: glyph + label on the left, count number on the right in `var(--accent-gold)`.
- Folio entries below the type list: Cormorant 400, `--fs-body-sm`.
- Active entry: `var(--accent-rust)`, 2px solid left border in `var(--accent-rust)`, 8px left padding offset.
- Inactive entry (deceased): italic, `var(--text-muted)`.

---

## Iconography

The mockups use a small, consistent set of monoline glyphs (one per folio type), each ~14px:

| Type | Symbol used in mockup | Suggested Lucide icon |
|---|---|---|
| Character | ◐ (half-circle) | `circle-user` or `user` |
| Species | ✦ (four-point star) | `sparkles` |
| Location | ◇ (small diamond) | `map-pin` or `diamond` |
| Event | ⚡ (lightning) | `zap` |
| Faction | ✺ (asterism) | `users` |
| Lore | 𝕴 (fraktur I) — actually a book symbol | `book-open` |
| Timeline | ◷ (clock-quadrant) | `clock` |

Final implementation can use Lucide, sized to 14×14 with `stroke-width: 1.25` to keep the etched feel.

---

## Page Backgrounds

The landing page is rendered live by a WebGL fragment shader (drifting warm-gray smoke over parchment). Source: `prototype/webgl-hero.js`, variant `codex`. See [`04_Frontend.md`](04_Frontend.md) § Landing-Page WebGL Hero for the integration contract.

A per-project optional `cover.jpg` / `cover.webp` may sit in the project folder root and be composited as a faint photographic layer **on top of the shader** with `opacity: 0.35` and `mix-blend-mode: multiply` to keep text contrast. If WebGL is unavailable, this image (or the static parchment color) is the fallback.

Read mode does not display either the shader or the cover image. Only the landing route does.

---

## Tokens File (CSS)

For convenience, the rewrite should ship `packages/client/src/styles/tokens.css` containing all of the above as CSS custom properties. Generated from this document, not authored separately.
