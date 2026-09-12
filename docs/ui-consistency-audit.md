# UI consistency audit — handoff

Started from a complaint that the edit form's tags/domains/mortal-champions
fields looked and behaved like three unrelated widgets. That turned out to be
symptomatic: the same "same concept, built N times, slightly differently"
pattern recurs across the app. This doc is the running list, so work can
resume without re-deriving it.

## Done

Shared primitives now live in
[`components/ui/controls.module.css`](../packages/client/src/components/ui/controls.module.css):
`.fieldBox`, `.menuSurface` / `.menuOption` / `.menuEmpty`, and the button
system. **Anything new that takes typing, opens a menu, or is a button should
compose from there rather than restating the recipe.**

- **Six hand-rolled combobox implementations** (`TextListField`,
  `MultiselectField`, `WikiLinkPicker`, `SelectField`, `TagFilter`,
  `TopHeader`) each reimplemented open state, outside-click and keyboard nav.
  Extracted to [`hooks/useCombobox.ts`](../packages/client/src/hooks/useCombobox.ts).
  Fixed a real bug in passing: after adding a chip, a second click on the
  still-focused input did nothing, because reopening was wired only to
  `onFocus`, which doesn't fire on an already-focused element.
- **Four chip-list fields** unified into
  [`ChipField`](../packages/client/src/components/ui/ChipField.tsx). Call
  sites now differ only in data (option source, whether typed text commits,
  whether chips carry an icon).
- **Alias-search regression, introduced and fixed in the same session.**
  `ChipField` initially hand-rolled substring matching instead of using
  `scoreFolio` — the single source of truth per ADR-0011, which exists
  *because* this had already diverged once. Typing "Ulysses" found nothing and
  offered to create a broken link to a nonexistent folio while Odysseus sat
  right there. Both `ChipField` (via its `score` prop) and `WikiLinkPicker`
  now rank through `scoreFolio`.
- **One field-box recipe.** `.input` and `.pickerInputWrap` compose
  `.fieldBox`; single-line height is a `--control-height` token.
- **One create-entry affordance.** `Sidebar` and `CategoryIndexView` both use
  [`NewEntryButton`](../packages/client/src/components/ui/NewEntryButton.tsx);
  prominence is a named variant, not a second implementation.
- **One menu surface.** The three dropdowns had disagreed on ground, border,
  radius, shadow, highlight and z-index (the edit-form menu's `z-index: 10`
  could render beneath other chrome).
- **One button system** — `.btn` + size + tone. Tone carries meaning
  consistently: filled dark = primary, filled rust = destructive, outlined
  muted = secondary, outlined rust = accented create. Previously "primary"
  meant outlined-fills-on-hover on the edit form and filled in dialogs.
- **Accessibility**: missing `aria-label`s on the category index's create
  buttons; section-level `wikilink-list` fields (Mortal Champions, Connected
  Events) had *no accessible name at all* because `FolioEditView` never passed
  `label` to `FieldEditor` on that path.
- **Wrong empty-state copy**: the category index said "No entries yet." when a
  search or tag filter simply matched nothing.
- **Dialog titles** use the display italic at `--fs-h3` in rust — sized up
  rather than bolded, since Cormorant's heavier weights are unpleasant.
- **Dev server moved to `:5273`.** On Windows a second process can bind an
  already-listening port, so sharing Vite's 5173 default with another local
  project silently served that app instead while Vite reported success.

### Gotcha worth remembering

CSS Modules emits a composed class *after* the class composing it, so anything
`.fieldBox` declares beats a consumer trying to override it. That silently
flattened the textarea's 240px min-height to 38px on the first attempt. The
shared primitives therefore own **treatment only** — never layout (`display`,
`min-height`, `gap`, positioning). Also: `composes` is rejected on compound
selectors like `.btnConfirm.danger`; use a standalone class.

## Still open

Ordered by value. Nothing here is started.

1. **Tests.** The largest gap, and not part of the original audit. This
   session refactored shared components with no automated coverage, verified
   only by clicking through the browser — and shipped the alias regression
   above, which a test would have caught immediately. **Blocked on a decision:**
   vitest is present but there is no `jsdom` or `@testing-library/react`, so
   real `ChipField` tests mean adding dependencies. The subset needing no new
   deps: `parseWikiLinkText` (its file `utils/links.test.ts` exists but doesn't
   cover it), and extracting the option-building/scoring out of
   `WikilinkListField` into a pure helper — which would directly cover the bug
   that shipped.
2. **Four loading and four empty-state treatments**, none using the existing
   shared `EmptyState` component. Also `…` vs `...` inconsistency in loading
   copy. Real, user-visible, no judgment calls.
3. **Single wikilink field vs. wikilink-list still diverge.** `WikiLinkPicker`
   commits on `onClick` and sets `aria-activedescendant` / option ids;
   `ChipField` commits on `onMouseDown`+`preventDefault` and sets neither.
   Different placeholder convention too. Worth aligning now that both rank
   through `scoreFolio`.
4. **Cosmetic.** Duplicated breadcrumb primitives between
   `FolioHeader.module.css` and `CategoryIndexView.module.css` (the two
   `.crumbCurrent` rules differ); duplicated middot-separator recipe; a few
   inline `style={{}}` objects that should be classes. Cheap, low value.

## Investigated and dropped — do not "fix" these

- **Confirmation asymmetry is not a defect.** There is already a coherent
  rule: deleting a folio writes to disk and navigating away loses work, so
  both confirm; removing a cover image and clearing chips are *draft* edits
  (`onChange(undefined, null)`) undone by Discard, so neither should. Don't
  add confirmations to draft edits.
- **Verb drift is mostly legitimate.** Delete destroys a folio, Remove takes
  something out of one, Discard throws away unsaved changes, Dismiss closes a
  notice. Different words for different things.
- Read-mode `WikiLinkChip` vs edit-mode chips, and index rows vs backlink
  cards, are deliberate — documented in `MetaSection.module.css`.
- Already clean, verified: `useFocusTrap` shared by both dialogs,
  `EntryContent`, `WikiLinkChip`, `EmptyState`, the design tokens, and
  `packages/shared` (no duplicated parsing/validation; `scoreFolio` properly
  shared with the server).
