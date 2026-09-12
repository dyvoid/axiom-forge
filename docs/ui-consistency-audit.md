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
compose from there rather than restating the recipe.** Alongside it:
[`eyebrow.module.css`](../packages/client/src/components/ui/eyebrow.module.css)
(the uppercase strip above a page title, and its crumbs),
[`separators.module.css`](../packages/client/src/components/ui/separators.module.css)
(the `Alpha · Beta` middot run), and the
[`LoadingState`](../packages/client/src/components/ui/LoadingState.tsx) /
[`EmptyState`](../packages/client/src/components/ui/EmptyState.tsx)
components.

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
- **One loading treatment and one empty-state treatment.** Five views
  hand-rolled "still fetching" across three font/colour recipes and two
  spellings of the ellipsis (`ProjectContext`'s was a nine-property inline
  style object, and wasn't in the original audit). All now render
  `LoadingState`; `FolioSkeleton` keeps its richer bones and composes the
  same caption treatment. `EmptyState` gained an `inline` variant for
  "this list came back with nothing", which both indexes now use.
- **The single wikilink field and the wikilink list agree.** Both commit on
  `onMouseDown` + `preventDefault`, both wire `aria-controls` / option ids /
  `aria-activedescendant`, and both default to the shared `Search <target>…`
  placeholder. `WikilinkField` used to pass the field's accessible name in
  as the *placeholder*, so a "Patron Deity" field prompted with "Patron
  Deity" instead of saying what it searched. Candidate scoping (target
  filter, already-selected exclusion, the `Folder/Name` id, whether the
  folder column shows) was written twice and is now pure helpers in
  `utils/links`, with tests.
- **One eyebrow, one middot run.** The eyebrow strip existed three times and
  the two `.crumbCurrent` rules had already drifted -- only the category
  index's laid out an icon beside the label, so the folio header's would
  have collapsed one. The middot run existed twice, differing only in the
  gap (now a `--middot-gap` token).
- **Accessibility, second pass**: neither index's search input had an
  accessible name.
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

1. **Component tests.** Still the largest gap. The no-new-dependency subset
   is done: `utils/links` now holds the wikilink-field logic that used to
   live inside two components, and `utils/links.test.ts` covers
   `parseWikiLinkText`, `searchPlaceholder`, `isLinkCandidate`,
   `showsFolderColumn` and `linkKey` (26 tests).

   What remains needs a decision: vitest is present but there is no `jsdom`
   or `@testing-library/react`, so testing `ChipField` and `WikiLinkPicker`
   as *components* — the open/commit/keyboard behaviour, which is where the
   alias regression actually shipped — means adding those two devDependencies.
   Everything short of that has been extracted and covered. Until then the
   controls are verified by driving the real app in a browser; the flows
   worth re-checking after any change to them are both index views, the
   folio read and edit views, and committing an option in each picker by
   mouse and by keyboard.

2. **Inline styles that are staying.** Three remain and are correct as
   inline: `TextareaField`'s picker `top`/`left` (computed caret position),
   `WebGLHero`'s canvas box (the canvas is positioned by the component that
   owns it, not by a sheet), and `Icon`'s `flexShrink` (one declaration
   intrinsic to the element).

3. **The editor's eyebrow uses middots where the read view's uses arrows.**
   Left as is deliberately: the read view's is a navigational breadcrumb
   with links, the editor's is a static "which folio is open" label. They
   now share the typography and the middot recipe, not the glyph. Revisit
   only if the editor's ever becomes navigable.

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
