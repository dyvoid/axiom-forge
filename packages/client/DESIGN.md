---
name: Axiom Forge
description: A schema-driven, local-first encyclopedia — the worldbuilder's illuminated manuscript.
colors:
  primary: "#9a7a2c"
  secondary: "#8a3522"
  parchment: "#f3ead8"
  vellum: "#ebe0c8"
  vellum-hover: "#e4d8be"
  border: "#cdb98e"
  border-soft: "#d9c8a4"
  ink: "#221b13"
  ink-secondary: "#4a3f2e"
  ink-muted: "#6c5e46"
typography:
  display:
    fontFamily: "Cormorant Garamond, EB Garamond, Georgia, serif"
    fontSize: "clamp(2.75rem, 7vw, 5.5rem)"
    fontWeight: 400
    lineHeight: "1.05"
    letterSpacing: "normal"
  headline:
    fontFamily: "Cormorant Garamond, EB Garamond, Georgia, serif"
    fontSize: "4rem"
    fontWeight: 400
    lineHeight: "1.05"
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Cormorant Garamond, EB Garamond, Georgia, serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: "1.05"
    letterSpacing: "normal"
  body:
    fontFamily: "Spectral, EB Garamond, Georgia, serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: "1.65"
    letterSpacing: "normal"
  label:
    fontFamily: "Spectral, EB Garamond, Georgia, serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: "1.0"
    letterSpacing: "0.18em"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: "1.7"
    letterSpacing: "normal"
rounded:
  none: "0"
  sm: "2px"
  md: "4px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "24px"
  "6": "32px"
  "7": "48px"
  "8": "64px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.parchment}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "8px 24px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "8px 18px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "3px 10px"
  button-add:
    backgroundColor: "transparent"
    textColor: "{colors.secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "8px 16px"
  input-text:
    backgroundColor: "rgba(255, 250, 235, 0.55)"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "7px 10px"
  input-search:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0"
  chip-wikilink:
    backgroundColor: "transparent"
    textColor: "{colors.secondary}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0"
  chip-tag:
    backgroundColor: "rgba(154, 122, 44, 0.12)"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "3px 4px 3px 8px"
  chip-filter:
    backgroundColor: "{colors.vellum}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  card-backlink:
    backgroundColor: "{colors.vellum}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "16px"
  nav-sidebar-type:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "8px 32px"
  nav-sidebar-folio:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "2px 32px"
---

# Design System: Axiom Forge

## Overview

**Creative North Star: "The Illuminated Manuscript"**

Axiom Forge is the worldbuilder's illuminated manuscript — a schema-driven encyclopedia rendered in the language of hand-set type, gold leaf, and iron-gall ink on parchment. The metaphor is not costume; it is the structural logic of the interface. Content is the illumination; the chrome is the vellum and rule that holds it.

The feel is archival and precise. This is a reference work that takes itself seriously — an encyclopedia, not a notebook — and the typography and palette carry that authority. Cormorant Garamond sets the folio titles at a scale that demands the page be read, not scanned; Spectral carries the prose and the labels with the evenness of a well-printed book. The palette is a narrow band of warm parchment tones bracketed by a single antique gold (the illuminator's leaf) and a single deep rust (the iron-gall stamp of an active or warning state). Nothing else is in color, because nothing else needs to be.

The system is flat by default. Depth is conveyed by tonal layering — parchment page, vellum panel, hairline and dotted rules — and by the typography itself, which does most of the hierarchical work that shadows would do in a lesser system. Shadows appear only on transient overlays (dropdowns, dialogs, popovers), where they mark a surface lifted momentarily off the page. Components are restrained and refined: buttons are quiet, often outline or ghost, and the primary action earns its weight by being the only filled control on the surface; inputs are transparent with a hairline or dashed rule that darkens to rust on focus. The content is the loud part.

**Key Characteristics:**
- Print-aesthetic, archival, precise — a reference work, not a SaaS product
- Two-serif typography: Cormorant Garamond for display, Spectral for body and labels
- Narrow parchment palette + two accents (antique gold, deep rust); no other color
- Flat by default; tonal layering and rules carry depth, shadows only on overlays
- Restrained controls; the primary action is the only filled button on a surface
- Hairline and dotted rules as the primary structural device
- Tracked, uppercase Spectral eyebrows as the section/label vocabulary
- Every text run in lists and cards truncates with an ellipsis; nothing wraps

## Colors

The palette is a narrow warm-parchment band with two accents. Antique Gold is the brand accent — it marks type identity (chips, icons, active link text) and appears sparingly. Deep Rust is the active/danger accent — it marks the current selection, the editing state, warnings, and focus. Everything else is a tone of parchment or ink.

### Primary
- **Antique Gold** (`#9a7a2c`, `--accent-gold`): The illuminator's leaf. Used on folio-type chips, sidebar type icons, the wikilink chip's type glyph, tag hover, and the selected-wikilink state in the picker. It never carries body text and never fills a button. Its rarity is the point.

### Secondary
- **Deep Rust** (`#8a3522`, `--accent-rust`): The iron-gall stamp. Used for the active sidebar item (text + left rule + tinted ground), the EDITING banner, focus rings on inputs, the Grand Index letter headers, wikilink chip text, warning labels and borders, and the confirm/delete actions in dialogs. It is the system's only "loud" color, reserved for state and consequence.

### Neutral
- **Warm Parchment** (`#f3ead8`, `--bg-page`): The main canvas. The ground everything sits on.
- **Aged Vellum** (`#ebe0c8`, `--bg-panel`): Sidebar, top header, search box, backlink cards, dialog warning blocks. One step darker than the page — the tonal layer that reads as "surface."
- **Vellum Hover** (`#e4d8be`, `--bg-hover`): The keyboard/hover ground. A shade past vellum, well short of the soft border, so it reads on both page and panel.
- **Sepia Ink** (`#221b13`, `--text-primary`): Folio titles, body prose, the filled primary button's ground.
- **Ink Secondary** (`#4a3f2e`, `--text-secondary`): Sidebar item text, field values, dialog messages.
- **Ink Muted** (`#6c5e46`, `--text-muted`): Eyebrows, labels, placeholders, counts, secondary metadata. The workhorse for "this is structural, not content."
- **Border** (`#cdb98e`, `--border`): Card and input borders, the top header rule, the folio divider.
- **Border Soft** (`#d9c8a4`, `--border-soft`): Sidebar dividers, subtle separators, the search box border, dotted field rules.

### Named Rules
**The Two-Accent Rule.** The palette has exactly two accents: Antique Gold for identity, Deep Rust for state. No third accent, no semantic color invented for "success" or "info." If a new state needs color, route it through one of the two — gold for soft integrity warnings, rust for hard errors and active state.
**The Tonal-Only Depth Rule.** Depth between static surfaces is conveyed only by stepping between Parchment, Vellum, and Border. Never by a shadow. A card is darker than the page; a panel is darker than a card; that is the whole depth vocabulary at rest.

## Typography

**Display Font:** Cormorant Garamond (fallback: EB Garamond, Georgia, serif)
**Body Font:** Spectral (fallback: EB Garamond, Georgia, serif)
**Label Font:** Spectral (same family, tracked and uppercased)
**Mono Font:** ui-monospace stack (SFMono-Regular, Menlo, Consolas)

**Character:** A humanist Renaissance serif for display paired with a clean modern serif for body — two serifs in deliberate conversation, the way a printed book pairs a display face for chapter titles with a text face for the body. The pairing reads as "set," not "styled." Loaded weights are narrow on purpose: Cormorant Garamond carries 400/500/600 roman and 400/500 italic; Spectral carries 300/400/500/600 roman and 400 italic. 600 is the heaviest Cormorant weight loaded — the index row title uses it because 700 triggers a faux-bold smear.

### Hierarchy
- **Display** (Cormorant Garamond, 400, `--fs-hero` 88px / `--fs-hero-xl` 112px, line-height 1.05): The folio H1 and the landing title. The largest mark on any surface; it announces the entry.
- **Headline** (Cormorant Garamond, 400, `--fs-h1` 64px, line-height 1.05, letter-spacing -0.01em): The Grand Index and Category Index page titles. One step below the folio title.
- **Title** (Cormorant Garamond, 600, `--fs-subtitle` 18px): The index row title — the name column in a category or grand index. 600 is the heaviest loaded weight; do not synthesize bolder.
- **Subtitle** (Spectral, 400 italic, `--fs-subtitle-lg` 24px / `--fs-subtitle` 18px): The folio subtitle and alias byline. Italic is the marker for secondary, "also known as" voice.
- **Body** (Spectral, 400, `--fs-body-lg` 17px / `--fs-body` 16px, line-height 1.65): Prose content and field values. The prose column caps at `--prose-max-width` 640px for reading measure.
- **Body Small** (Spectral, 400, `--fs-body-sm` 15px): Sidebar counts, index glosses, card snippets, edit-field input text.
- **Meta** (Spectral, 400, `--fs-meta` 13.5px): Tag runs, warning list items, secondary metadata.
- **Label** (Spectral, 500, `--fs-eyebrow` 11px, letter-spacing 0.18em–0.22em, uppercase): Section headers, field labels, eyebrows, the top-header logo, button text. The tracked uppercase eyebrow is the system's structural voice.
- **Tiny** (Spectral, 400, `--fs-tiny` 10px, letter-spacing 0.18em): The Grand Index meta line. The smallest mark; use sparingly.

### Named Rules
**The Two-Serif Rule.** Display is Cormorant Garamond; body and labels are Spectral. Never set body in Cormorant or titles in Spectral — the hierarchy depends on the family contrast.
**The Eyebrow Voice Rule.** Section headers, field labels, and button text are Spectral 500, 11px, uppercase, tracked 0.18em–0.22em. This is the single structural voice of the system; do not introduce a second label style.
**The Italic-Is-Secondary Rule.** Italic marks secondary, "also known as," or placeholder voice — the folio subtitle, alias bylines, tag runs, search/filter placeholders, empty-state copy. It is not a decorative switch. Action labels (buttons) and structural labels (field section headers, tags labels, status text) are roman. The landing hero title is the one exception: italic serif at display size is an editorial register choice, not a secondary-voice marker.

## Layout

The application shell is a fixed 240px sidebar (`--sidebar-width`) and a flex-1 main column, under a 48px top header. The whole shell is `100vh` with `overflow: hidden`; the main column scrolls. The page max-width is 1280px (`--page-max-width`); content is capped at 968px (`--content-max-width`) and centered.

The folio read view is a two-column top block — prose column (flex 1, capped at `--prose-max-width` 640px, right-bordered with a hairline) and a fixed 280px meta column (`--meta-col-width`), separated by a 48px gap (`--two-col-gap`). Remaining sections stack below at 48px (`--sp-7`) rhythm. A double-rule divider (top + bottom border, 3px tall) separates the top block from the remaining sections.

The Grand Index flows **column-major**: CSS multi-column with `column-width: 260px` and `column-gap: 64px`, `break-inside: avoid` per letter group, `column-fill: balance`. An alphabetical index is scanned down a column, then to the next — never across rows. The Category Index is a single stacked list; each entry is one `nowrap` line with a content-relative name column `clamp(9ch, 22%, 24ch)` so rows align by construction without subgrid.

The edit view mirrors the read layout but adds a sticky toolbar (semi-transparent parchment, `backdrop-filter: blur(6px)`, bottom-bordered) that pins to the top of the scroll container. Field rows in edit mode use a fixed `170px 1fr` label/value grid; the meta section in read mode uses `minmax(0, max-content) 1fr` so the value gets whatever the labels don't need.

The spacing rhythm is a 4px base scale: 4, 8, 12, 16, 24, 32, 48, 64 (`--sp-1` through `--sp-8`). Section gaps run at 32–48px; field gaps at 12–16px; chip and tag gaps at 4–8px.

**Responsive behavior is not yet implemented** — there are zero `@media` queries in the client, and the 88px folio title, fixed 240px sidebar, and fixed 280px meta column break under ~1100px. This is a known gap (PICKUP.md design backlog), not a design decision. A breakpoint strategy is pending.

## Elevation & Depth

The system is flat by default. Depth between static surfaces is conveyed by tonal layering (Parchment → Vellum → Border) and by hairline and dotted rules, never by shadows. The typography and the rules do the structural work that shadows would do in a shadow-based system.

Shadows appear **only on transient overlays** — surfaces lifted momentarily off the page and returned:

### Shadow Vocabulary
- **Overlay Soft** (`box-shadow: 0 4px 20px rgba(34, 27, 19, 0.25)`): The search dropdown. A diffuse parchment-toned lift.
- **Overlay Medium** (`box-shadow: 0 8px 28px rgba(40, 30, 20, 0.18)`): The CxSelect menu and the tag-filter dropdown. Slightly deeper for a heavier panel.
- **Overlay Accent** (`box-shadow: 0 4px 16px rgba(138, 53, 34, 0.2)`): The inline wikilink picker popover. Tinted rust to signal the focused state.
- **Modal Scrim** (`background: rgba(34, 27, 19, 0.35–0.4)`): The dialog overlay. Not a shadow but the depth cue for a modal — the page is dimmed behind a lifted surface.

### Named Rules
**The Flat-At-Rest Rule.** No `box-shadow` on any surface at rest — not cards, not panels, not buttons, not inputs. Shadows are the exclusive vocabulary of transient overlays (dropdowns, popovers, dialogs). A shadow on a resting card is a SaaS-dashboard tell and is wrong here.
**The Rule-Not-Shadow Rule.** Where a lesser system would drop a shadow to separate two surfaces, this system draws a 1px hairline (`--border` or `--border-soft`) or a dotted rule (`rgba(108, 94, 70, 0.35)`). The dotted field rule is the signature separator within a meta section.

## Shapes

The form language is deliberately square. The default corner is 0 — inputs, buttons, the search box, dialogs, and the inline picker popover all have `border-radius: 0`. A 2px radius (`--rounded-sm`) appears only on the smallest controls (the edit button, the sync button, the filter chip); a 4px radius (`--rounded.md`) appears only on the backlink card and the search dropdown. Nothing is more rounded than 4px.

Borders are the primary shape device: 1px solid (`--border` for strong, `--border-soft` for subtle) and 1px dotted (`rgba(108, 94, 70, 0.35)` for field separators). The dashed border is reserved for the editable state — the title input's bottom rule is `1px dashed --border`, darkening to solid rust on focus; the edit-mode "add" button uses a dashed muted outline. Solid = read, dashed = editable, dotted = structural separator.

### Named Rules
**The Square Rule.** Default radius is 0. Radius appears only on small controls (2px) and on cards/dropdowns (4px), and never as a design feature — only where a slightly softened corner aids a dense cluster. Never introduce a pill, a lozenge, or a radius above 4px.
**The Border-State Rule.** Border style encodes state: solid = read/structural, dashed = editable/focused, dotted = separator within a list. Do not mix these — a dashed border on a resting card is meaningless, a dotted border on an input is wrong.

## Components

### Buttons
- **Shape:** Square (radius 0), except the small outline button (2px).
- **Primary** (Save / Confirm): Sepia Ink ground, Parchment text, uppercase tracked label, `padding: 8px 24px`, 1px ink border. The only filled control on a surface. No hover state — its filled state is the hover. Disabled fades to 0.5 opacity.
- **Ghost / Cancel / Copy** (secondary actions): Transparent ground, 1px `--border` outline, Ink Muted text, `padding: 8px 18px`. Hover deepens text to Ink and border to Ink Muted.
- **Outline** (the small Edit button, the sync button): Transparent, 1px `--border-soft` outline, Ink Muted text, `padding: 3px 10px`, 2px radius. Hover deepens text and border.
- **Add** (Category Index "Add"): Transparent, 1px Deep Rust outline, Deep Rust text, `padding: 8px 16px`. Hover tints the ground `rgba(138, 53, 34, 0.08)`. The outline-in-the-accent is the "create" voice.
- **Stub** (create-stub in broken-link warnings): Transparent, 1px Antique Gold outline, Antique Gold text, 10px uppercase, `padding: 2px 6px`, 0.7 opacity. Hover to 1.0 with a gold ground tint.

### Chips
- **Wikilink Chip** (signature): Inline, transparent ground, Deep Rust text, Antique Gold type glyph, `gap: 4px`, `white-space: nowrap`. Hover deepens text to Ink. Dead links drop to Ink Muted with `cursor: help` and a tooltip — no strikethrough. The literal `[[ ]]` brackets are intentionally omitted from the UI.
- **Tag Chip** (edit mode): `rgba(154, 122, 44, 0.12)` gold-tinted ground, `1px solid rgba(154, 122, 44, 0.4)` gold border, Ink text, `padding: 3px 4px 3px 8px`, square. A muted remove button sits inside.
- **Filter Chip** (tag filter): Vellum ground, `1px solid --border`, 2px radius, `padding: 2px 8px`, Ink text. Remove button hovers to rust.

### Cards / Containers
- **Backlink Card:** Vellum ground, `1px solid --border-soft`, 4px radius, `padding: 16px`. Hover deepens border to `--border` and ground to `--bg-hover`. No shadow. The only resting "card" in the system.
- **Warning Block (read mode):** No border, `2px solid --accent-rust` left rule, `color-mix(in srgb, --accent-rust 6%, --bg-page)` ground. The rust left rule is the warning's entire shape.
- **Warning Block (edit mode):** `1px solid --accent-rust` full border, `rgba(138, 53, 34, 0.05)` ground. A broken-links variant swaps rust for gold (`1px solid --accent-gold`, `rgba(154, 122, 44, 0.06)` ground) — integrity warning, not error.

### Inputs / Fields
- **Text Input** (edit mode): `rgba(255, 250, 235, 0.55)` warm-translucent ground, `1px solid --border`, square, `padding: 7px 10px`. Focus deepens border to Deep Rust and ground to `rgba(255, 250, 235, 0.9)`. Transition 120ms.
- **Title Input** (edit mode): Transparent, no border, `1px dashed --border` bottom rule, Cormorant Garamond at `--fs-hero`. Focus swaps the dashed rule for solid Deep Rust. The dashed rule is the editable-title signature.
- **Search / Filter Input:** Transparent, no border, no padding, italic Spectral. The bar itself carries the border (a bottom rule on the filter bar, a full `1px --border-soft` box on the header search). Placeholder is Ink Muted italic.
- **Textarea:** Shares the text input treatment, `min-height: 240px`, `resize: vertical`, `line-height: 1.7`, body size.
- **CxSelect** (custom dropdown): The trigger shares the text input treatment. The menu is Parchment-grounded, `1px solid --ink-muted` border, `box-shadow: 0 8px 28px rgba(40, 30, 20, 0.18)`. Items are 8px/12px padded with a `--border-soft` bottom rule; hover and selected tint the ground `rgba(138, 53, 34, 0.05–0.08)`. Native `<select>` is never used — it would break the parchment typography.

### Navigation
- **Sidebar Type Row:** Transparent, `padding: 8px 32px`, Spectral body-large, Ink text, Antique Gold icon at `gap: 12px`. Hover grounds `--bg-hover`. Active state adds a Deep Rust bottom rule and turns both label and icon rust.
- **Sidebar Folio Link:** Transparent, `padding: 2px 32px`, Spectral subtitle, Ink Muted text, `2px transparent` left rule. Hover deepens text to Ink. Active state turns text and left rule Deep Rust, grounds `rgba(138, 53, 34, 0.07)`, weight 600.
- **Sidebar Group Title:** Spectral 500, `--fs-eyebrow`, tracked 0.22em, uppercase, Ink Muted, `padding: 0 32px`. The eyebrow voice, applied to navigation.
- **Top Header:** 48px tall, Vellum ground, `1px --border` bottom rule. Logo is the eyebrow voice; project title is italic Spectral subtitle. The Sync button is the small-outline treatment with a spin state (0.7s linear).

### Wikilink Picker (signature)
The autocomplete combobox for inserting wikilinks. The input wrap shares the text-input treatment; focus deepens border to rust. The selected state shows the chosen folio as an Antique Gold run (the gold = "this is an identity link"). The dropdown menu rows show the name with a folder eyebrow pinned right (`11px`, tracked, uppercase, Ink Muted). An inline variant lives inside the tag-box for wikilink-list fields; a popover variant (`260px`, rust border, rust-tinted shadow) anchors to the textarea for `[[` insertion.

### Entry Row / Card (signature — ADR-0011)
Two idioms sharing one type scale, deliberately not converged:
- **Card** (search dropdown, Linked Mentions): Stacked — title + italic alias on the left, folder eyebrow pinned right, then a 2-line italic snippet. For "what is this thing I don't recognise?"
- **Row / Inline** (Category Index, Grand Index): One `nowrap` line — name column (`clamp(9ch, 22%, 24ch)`, Cormorant 600) + gloss column (Spectral body-small, muted). For "where is the one I'm looking for?" The index is the folder, so no folder label; it sorts and scans by title, so no alias.

Every text run truncates with an ellipsis; nothing wraps. Long titles and long alias lists always exist; a predictable ellipsis beats rows and cards whose height changes with content.

## Do's and Don'ts

### Do:
- **Do** set every color, spacing, radius, and font size from a `tokens.css` token. `npm run lint` fails on undefined `var(--…)` references; prefer an existing token and add to `tokens.css` only when the system genuinely lacks the concept.
- **Do** convey depth between static surfaces by stepping between Parchment, Vellum, and Border — tonal layering, not shadows.
- **Do** use the tracked uppercase Spectral eyebrow (`--fs-eyebrow`, 0.18em–0.22em) for every section header, field label, and button. It is the single structural voice.
- **Do** reserve Deep Rust for state and consequence (active, focus, warning, delete) and Antique Gold for identity (type chips, icons, wikilink glyphs). The two accents have jobs; do not swap them.
- **Do** use the dotted rule (`rgba(108, 94, 70, 0.35)`) to separate fields within a meta section — it is the signature list separator.
- **Do** truncate every text run in lists and cards with an ellipsis (`white-space: nowrap; overflow: hidden; text-overflow: ellipsis`). Uneven heights break vertical rhythm more than a clipped tail breaks one entry.
- **Do** size the index name column content-relative (`clamp(9ch, 22%, 24ch)`) so rows align by construction across projects and zoom levels.
- **Do** flow the Grand Index column-major (CSS multi-column, `break-inside: avoid` per letter group). An alphabetical index is scanned down a column, then to the next.

### Don't:
- **Don't** use SaaS-dashboard vocabulary: no rounded lozenges, no bright accent fills on resting cards, no drop shadows on cards or panels at rest, no "card grid" feel. Axiom Forge is a print-aesthetic reference work, not Notion or Confluence.
- **Don't** put a `box-shadow` on any resting surface. Shadows are the exclusive vocabulary of transient overlays (dropdowns, popovers, dialogs).
- **Don't** introduce a third accent color, a "success green," or an "info blue." Route every colored state through Antique Gold (soft integrity) or Deep Rust (hard state/error).
- **Don't** use a radius above 4px, a pill, or a lozenge. The default corner is 0; 2px and 4px are the only softening, and only on small controls and cards.
- **Don't** use native `<select>`, native checkbox/radio chrome, or any browser control that breaks the parchment typography. Use `CxSelect` and custom controls.
- **Don't** set body text in Cormorant Garamond or titles in Spectral. The hierarchy depends on the family contrast.
- **Don't** synthesize a Cormorant Garamond weight heavier than 600. 700 triggers a faux-bold smear; the index row title uses 600 for this reason.
- **Don't** add Tailwind, CSS-in-JS, or inline styles that hardcode colors, spacing, or typography. Inline styles for dynamic computed values (positions, transforms, dimensions) are fine; everything else goes through tokens and CSS Modules.
- **Don't** show the literal `[[ ]]` brackets around wikilinks in the UI, and don't strikethrough dead links. Dead links are identified by a muted color, `cursor: help`, and a tooltip.
