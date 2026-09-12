# UI consistency audit — handoff

Started from a user complaint that the edit form's tags/domains/mortal-champions
fields looked and behaved like three unrelated widgets. That turned out to be
symptomatic: the same "same concept, built N times, slightly differently"
pattern recurs across the app. This doc is the running list, so work can
resume without re-deriving it.

## Done this session

- **Six hand-rolled dropdown/combobox implementations** (`TextListField`,
  `MultiselectField`, `WikiLinkPicker`, `SelectField`, `TagFilter`,
  `TopHeader` search) each reimplemented open state, outside-click, and
  keyboard nav independently. Extracted to
  [`hooks/useCombobox.ts`](../packages/client/src/hooks/useCombobox.ts).
  This also fixed a real bug: after adding a chip via the dropdown, a second
  click on the still-focused input did nothing (reopen was wired only to
  `onFocus`, which doesn't fire on an already-focused element). Affected tags,
  mortal champions, and the index tag filter.
- **Four visually/behaviorally distinct "chip list" fields** (tags, domains,
  wikilink-lists, index tag filter) unified into one
  [`ChipField`](../packages/client/src/components/ui/ChipField.tsx) +
  [`controls.module.css`](../packages/client/src/components/ui/controls.module.css)
  `.fieldBox` primitive. What varies between call sites is now only data
  (option source, whether typed text can be committed, whether chips carry an
  icon), never a different component. The index search bar and tag filter
  also now compose the same `.fieldBox` as the edit-form fields (user
  explicitly chose "match the control" when search-box vs. chip-box drifted
  after the first pass).
- **Regression I introduced and then fixed**: `ChipField`'s default
  substring matcher didn't know about folio aliases, so typing an alias
  (e.g. "Ulysses" for Odysseus) in a wikilink picker found nothing and offered
  to create a broken link — silent data corruption. `packages/shared` already
  has `scoreFolio` (ADR-0011) as the single source of truth for this exact
  problem, previously ignored by this new code. Both `ChipField` (via a
  `score` prop) and `WikiLinkPicker` now rank through `scoreFolio`.
- Missing `aria-label`s on `CategoryIndexView`'s inline create-entry
  buttons, and a related gap the audit missed: section-level `wikilink-list`
  fields (Mortal Champions, Connected Events) had **no accessible name at
  all** because `FolioEditView.tsx` didn't pass `label` to `FieldEditor` for
  that code path — fixed by passing `sectionName`.
- Wrong empty-state copy: `CategoryIndexView` said "No entries yet." even when
  the category had entries but a search/tag filter matched none. Now
  distinguishes "No results found." for the filtered case.
- Minor: curly vs straight quotes between the two "Press ↵ to add …"
  messages; `WikiLinkChip`/`WikiLinkPicker` now use the shared
  `wikiLinkDisplayName`/`filenameToDisplayName` helpers instead of inlining
  `replace(/_/g, ' ')`.

All 168 existing tests pass; typecheck clean. No new tests were added for the
above — worth doing before this ships.

## Not started — design-system items, need your call before touching

These are real, verified (file:line below), but each involves a visual
decision, not just a bug fix. Ordered roughly by how much they affect users.

1. **Two competing field-box recipes on the same edit form.**
   `controls.module.css` `.fieldBox` (40% ground, 38px min-height) vs.
   `fields.module.css` `.input` (55% ground, `--control-padding`) vs. a third
   hand-copy in `.pickerInputWrap`. Text/date/select fields use `.input`;
   chip fields use `.fieldBox`. They sit in adjacent rows at different
   heights/tints on the same form. Needs one recipe, not three.

2. **"Create a new entry" is built twice.**
   `Sidebar.tsx` (`+ New entry`, muted text button) vs.
   `CategoryIndexView.tsx` (`+ ADD ENTRY`, rust-bordered box) — same feature,
   different label casing/verb, different button style, near-verbatim
   duplicated CSS (`.newEntryForm` vs `.addForm` etc).

3. **Single wikilink field vs. wikilink-list still diverge** even after this
   session's work: `WikiLinkPicker` (single) uses plain `onClick` to commit
   and sets `aria-activedescendant`/option ids; `ChipField` (list) uses
   `onMouseDown`+preventDefault and sets neither. Different placeholder
   convention (field name vs. generic "add…"). Worth reconciling now that
   both go through `scoreFolio`.

4. **Three dropdown/menu surfaces**: `ChipField.module.css` `.menu`,
   `fields.module.css` `.menu` (z-index 10 vs 100, different hover tint), and
   `TopHeader.module.css` `.searchDropdown` (different background token,
   border-radius, shadow, highlight color).

5. **Six button recipes, three of them verbatim duplicates**, plus two
   contradictory "primary" looks (`FolioEditView.module.css` `.btnPrimary` is
   outlined; `ConfirmDialog.module.css` `.btnConfirm` is filled — both called
   "primary"). `CategoryIndexView.module.css` `.addBtn` is a seventh.

6. **Four loading treatments, four empty-state treatments**, none using the
   existing shared `EmptyState` component. Also `…` vs `...` inconsistency in
   loading copy.

7. **Confirmation asymmetry / inverted button semantics.** Delete and
   unsaved-nav confirm; cover-image removal and chip clear-all don't.
   `SchemaWarningsDialog`'s "Dismiss" gets the same filled/primary treatment
   that means "do the destructive thing" in `ConfirmDialog`. Verb drift:
   Delete / Remove / Discard / Dismiss / Clear all for similar operations.

8. **Low-severity / cosmetic**: literal `text-transform`-defeating caps in
   JSX (`"+ ADD ENTRY"`, `'ENTRY'/'ENTRIES'`) instead of CSS; duplicated
   breadcrumb primitives between `FolioHeader.module.css` and
   `CategoryIndexView.module.css` with one subtle difference; duplicated
   middot-separator recipe; a few inline `style={{}}` objects instead of
   classes.

## Recommended order for next session

Start with #2 (new-entry widget) — it's the most template-1-and-2 like the
original tags/domains problem: same feature, two implementations, one fix
collapses both. Then #1 (field-box recipes) since it's the most visible on
the very form we just touched. Save the button/menu/empty-state items (#4–7)
for a deliberate design-system pass rather than fixing them piecemeal, since
they touch a lot of surface area at once.
