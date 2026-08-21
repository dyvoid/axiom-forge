---
target: packages/client
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
p2_count: 3
timestamp: 2026-08-21T12-37-25Z
slug: packages-client
---
⚠️ DEGRADED: single-context (sub-agent quota exhausted — both assessments run inline sequentially)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Save status shows dirty/saving/saved; sync button has spin state. No loading skeleton on initial folio load. |
| 2 | Match System / Real World | 4 | Domain language is plain and precise. "Folio", "wikilink", "schema" are the product's vocabulary and used consistently. No jargon leaks. |
| 3 | User Control and Freedom | 3 | Escape exits edit view, back navigation guards unsaved changes, Discard/Save buttons clear. No undo on field edits within a draft. |
| 4 | Consistency and Standards | 3 | Token system enforces visual consistency. Custom select/chips are consistent. One remaining hardcoded font-size: 12px cluster in SchemaWarningsDialog. |
| 5 | Error Prevention | 3 | Delete confirmation via ConfirmDialog, unsaved-changes guard, broken-link warnings on save. No autosave/draft recovery. |
| 6 | Recognition Rather Than Recall | 3 | Sidebar shows all types, search is always visible, backlinks surface context. No breadcrumbs — location in the tree is not shown. |
| 7 | Flexibility and Efficiency | 2 | e key opens edit, Escape exits. No other shortcuts. No batch operations. No command palette. |
| 8 | Aesthetic and Minimalist Design | 3 | Print aesthetic is coherent and restrained. Landing footer type-counts and edit-view toolbar are slightly busy. Every element earns its place except the WebGL hero, which reads as flat. |
| 9 | Error Recovery | 3 | Broken-link warnings are specific with file paths. Save errors show inline. Stub-creation buttons on broken links are excellent recovery. No guidance on schema validation errors. |
| 10 | Help and Documentation | 2 | No in-app help, no tooltips on controls, no first-run guidance. FieldTypeHint is the closest thing. A solo tool can get away with less, but zero is low. |
| **Total** | | **29/40** | **Good — address weak areas, solid foundation** |

## Design Specificity Verdict

**Authored for this product.** The two-serif system (Cormorant Garamond display + Spectral body), parchment palette, print-aesthetic meta column with dotted dividers, and the WebGL smoke shader are not category-interchangeable. A generic wiki tool would not ship this. The schema-driven field rendering and wikilink chips are product-specific features rendered in a product-specific visual language.

**Where it slips:** The landing page is the weakest surface for specificity. The centered title + hairline rules + "ENTER →" CTA + footer type-counts is a safe editorial-landing pattern. The WebGL shader is supposed to differentiate it but reads as flat parchment — it's not earning its complexity. The edit view's toolbar (Save / Discard / Delete) is functional but generic; it doesn't carry the print aesthetic.

**Deterministic scan:** Detector returns [] — zero technical findings. Full mode (not degraded), all four parser modules available. CSS is 43.7 KB, 22 media queries, 6 clamp(), 1 dvh, 14 touch-target references, 0 backdrop-filter, 1 prefers-reduced-motion, 1 focus-visible. 17 italic declarations remain (down from 25). 7 hardcoded font-size: 12px in SchemaWarningsDialog — a distill pass miss. 37 hex color references in built CSS (expected — these are the token values inlined by the build).

## Overall Impression

A coherent, restrained print-aesthetic tool that knows what it is. The read view is the strongest surface — the two-column prose + meta layout with the dotted dividers and the folio header's nameplate feels like reading a well-set encyclopedia entry. The landing page is the weakest — it's safe, the WebGL hero doesn't register, and the footer type-counts feel like a dashboard widget glued to an editorial page. The biggest opportunity is making the landing page as authored as the read view — it's the first thing a user sees and currently the least distinctive surface.

## What's Working

1. **The read view's two-column layout.** Prose column with a right-border rule, meta column with dotted field dividers, and the folio header as nameplate. This is the print aesthetic fully realized — it feels like turning to a page in a reference volume. The responsive stacking (meta before prose on narrow screens) is the right call.

2. **The two-serif type system.** Cormorant Garamond for display/titles and Spectral for body/labels creates genuine hierarchy through family contrast, not just size. The index row titles in Cormorant 600 are particularly good — they scan as a printed index, not a web list.

3. **Broken-link recovery.** Dead wikilink chips are visually distinct (dashed underline, muted), focusable with aria-labels, and the edit view's broken-links panel offers "Create stub" buttons. This is thoughtful error recovery that turns a dead end into a next step.

## Priority Issues

### [P1] The landing page doesn't earn its space
**Why it matters:** The landing is the first surface a user sees. It currently reads as a centered title, two hairlines, a button, and a footer of type-counts — safe but flat. The WebGL shader that's supposed to differentiate it reads as barely-visible parchment texture. The footer type-counts are a dashboard widget in an editorial register.
**Fix:** Either make the WebGL hero actually visible (increase smoke contrast, add movement that registers) or cut it and lean into a pure typographic landing. Replace the footer type-counts with something that fits the print aesthetic — a colophon, a table of contents, or a featured entry.
**Suggested command:** /impeccable bolder

### [P1] No keyboard shortcuts beyond e and Escape
**Why it matters:** This is a tool for long sessions of reading, linking, and editing. A power user will open dozens of folios, edit many, and navigate constantly. Two shortcuts is a floor, not a system. Search has no / shortcut, save has no Cmd+S, navigation between entries has no keyboard path.
**Fix:** Add / to focus search, Cmd+S to save in edit view, [ / ] for prev/next entry in a list, g then a letter to go to a type index. Document them in a discoverable way (a ? overlay or a help menu).
**Suggested command:** /impeccable delight

### [P2] SchemaWarningsDialog still has hardcoded font sizes
**Why it matters:** 7 instances of font-size: 12px and 1 of font-size: 11px bypass the token system. The distill pass missed this file. If someone changes --fs-button or --fs-eyebrow, this dialog won't follow.
**Fix:** Replace font-size: 12px with var(--fs-button) and font-size: 11px with var(--fs-eyebrow).
**Suggested command:** /impeccable distill

### [P2] No breadcrumbs or location indicator
**Why it matters:** When a user navigates from the grand index to a category index to a folio, there's no visible trail. The sidebar shows the type tree but doesn't highlight the current location. In a large world (hundreds of entries), the user loses their place.
**Fix:** Add a breadcrumb to the folio header (e.g. "Index → Gods → Aphrodite") or highlight the current type in the sidebar. The folio header's eyebrow row already has the type name — extend it to a clickable breadcrumb.
**Suggested command:** /impeccable layout

### [P2] The edit toolbar is visually disconnected from the print aesthetic
**Why it matters:** The sticky toolbar (Save / Discard / Delete) uses tracked uppercase buttons that are functional but generic — they could be in any admin panel. The read view's folio header feels like a printed page; the edit view's toolbar feels like a web form. The transition from read to edit is jarring.
**Fix:** Consider a more editorial treatment — a thin rule with small-caps labels, or moving the actions into the folio header's actions row rather than a separate sticky bar. The print aesthetic should survive the transition to edit mode.
**Suggested command:** /impeccable polish

## Persona Red Flags

**Alex (Power User):** Only two keyboard shortcuts (e for edit, Escape to exit). No / for search, no Cmd+S for save, no keyboard navigation between entries. Search requires mouse focus. No batch operations — editing multiple folios means opening them one at a time. Alex will manage but won't love it.

**Jordan (First-Timer):** The landing page's "ENTER →" button is clear, and the sidebar shows all types with icons. But once inside, there's no guidance — no tooltips on the Sync button, no explanation of what wikilinks are, no first-run tour. The e to edit shortcut is invisible. Jordan will figure it out because the interface is simple, but only because it's simple, not because it's guided.

**Sam (Accessibility-Dependent):** The a11y hardening pass landed — focus traps, ARIA on comboboxes, form labels, skip link, reduced-motion. The remaining gap: no live region announcements for save success/failure, no aria-current on the active sidebar item, and the dead wikilink chips use role="link" with aria-disabled which some screen readers announce inconsistently. Solid foundation, a few polish items remain.

## Minor Observations

- The grand index's .meta uses letter-spacing: 0.18em hardcoded instead of var(--ls-eyebrow) — same value, but not tokenized.
- The backlinks panel header uses letter-spacing: 0.1em hardcoded — different from the eyebrow token's 0.18em, which may be intentional but isn't tokenized.
- The edit view's .fieldRow uses grid-template-columns: 170px 1fr — the 170px is hardcoded, not a token.
- The MetaSection .field uses gap: 16px and padding: 6px 0 hardcoded instead of var(--sp-4) and var(--sp-2).
- The landing page's .footer has height: 64px hardcoded.
- The card snippet's -webkit-line-clamp: 2 is webkit-only; Firefox supports line-clamp now but the prefix is fine for compatibility.

## Questions to Consider

- What if the landing page were a table of contents — a real index of the world's types with entry counts, set like a printed book's front matter — instead of a centered title and a button?
- What if the WebGL hero were cut entirely and the landing were pure typography on parchment? Would that be more confident, not less?
- What if the edit view's toolbar were integrated into the folio header's actions row, so read and edit shared the same visual frame?
- What if keyboard shortcuts had a ? overlay — would that change how Alex and Jordan both experience the tool?
