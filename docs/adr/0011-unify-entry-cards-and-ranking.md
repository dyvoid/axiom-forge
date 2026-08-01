# 11. Unify Entry Cards and Ranking

**Date:** 2026-07-30
**Status:** Accepted — implemented 2026-07-30

## Context

A folio is presented as a compact "entry" in five places, each hand-rolled with its own markup,
its own CSS module, and its own choice of which fields to show:

| Where | Component | Shows |
|---|---|---|
| Header search dropdown | `TopHeader` | title, folder, snippet |
| Linked Mentions | `BacklinksPanel` | title, folder, snippet |
| Category index rows | `CategoryIndexView` | title, then snippet *or* tags as a fallback |
| Grand Index | `GrandIndexView` | type icon, title |
| Sidebar folio list | `Sidebar` | title |

The same entity therefore looks different depending on where you meet it: the Grand Index shows a
type icon that no other surface shows, the category index substitutes tags when a snippet is
missing while the others just omit it, and only two of the five show the folder. Adding a field —
`aliases` being the immediate case — means touching five components and deciding the presentation
question five times.

Behind the visual drift sits a second, worse duplication: **three independent implementations of
folio ranking.**

1. `ProjectStore.search()` (server) — scores title, name, aliases, tags, folder, and snippet
   across documented tiers, and is unit-tested.
2. `GrandIndexView` — its own client-side copy: title, name, folder, snippet. No aliases, no tag
   scoring.
3. `CategoryIndexView` — a third, narrower copy: title, name, snippet. No aliases, no folder, no
   tags.

These have already diverged in a user-visible way. Searching an alias in the header finds the
folio, because the server scores aliases; typing the same alias into the Grand Index or a category
index finds nothing, because those copies never learned about them. The same query gives three
different answers depending on which box it is typed into.

## Decision

Two consolidations, which can land independently:

- **A shared entry-card component.** One component renders a folio index record, with variants for
  the contexts that genuinely differ (dropdown row, panel card, index row, sidebar link) rather
  than five unrelated implementations. It owns the decision about what an entry shows and in what
  order, so adding a field is one change. Presentation rules move into
  `docs/design-system.md`.
- **A shared ranking function.** Extract the scoring tiers into `packages/shared` as a pure
  function over `FolioIndexRecord`, and have `ProjectStore.search()` and both client-side index
  filters call it. The server keeps ownership of result limiting and tie-breaking; only the
  per-record scoring is shared. This matches the existing invariant that parsing and validation
  live in `packages/shared` so client and server cannot diverge — ranking belongs to the same
  category and was simply missed.

## Consequences

- One query gives one answer everywhere. Aliases, tags, and folder matching behave the same in the
  header, the Grand Index, and any category index.
- Adding or reordering a field on an entry becomes a single change instead of five, and cannot
  silently apply to some surfaces and not others.
- The shared scorer is directly unit-testable in `packages/shared`, where the existing scoring
  tests for `ProjectStore.search()` can largely move.
- This touches `packages/shared`, `packages/server`, and `packages/client`, which `AGENTS.md`
  classifies as a cross-package refactor requiring human review before it lands.
- Variants are a risk: if the four card contexts need more divergence than expected, a single
  component with many flags is worse than what it replaces. If that happens, prefer a shared
  layout primitive plus per-context composition over one component with a wide prop surface.
- Existing per-view CSS modules are consolidated or removed, so the token-based styling must be
  re-verified against `docs/design-system.md` in both light and dark contexts.

## Implementation

**Shared ranking** lives in `packages/shared/src/folioSearch.ts`, exporting `scoreFolio` (one
record, one query, returns 0 for no match) and `rankFolios` (score, drop non-matches, sort by score
with alphabetical tie-breaking). `ProjectStore.search()` is now `rankFolios(...).slice(0, 20)` —
it kept only the index source and the result limit. Both client index views call in as well.

Ordering deliberately stayed with the callers, as the Decision anticipated: the Grand Index groups
alphabetically by letter (so rank only decides placement within a letter), and a category index
preserves its alphabetical index order and uses the score purely as a filter.

Two behaviour changes fall out of the consolidation, both intended: the index views now score
**tags** (previously server-only), and the category index now scores **folder paths**. Searching a
tag such as `strategist` in the Grand Index returned nothing before and now returns its folio.

**Shared presentation** lives in `packages/client/src/components/ui/EntryContent.tsx` with three
variants — `card` (search dropdown, Linked Mentions), `row` (category index), `inline` (Grand
Index). It renders content only and never a wrapper: callers keep their own `Link`/`NavLink`/`div`,
plus hover, active, keyboard-highlight and grid styling. That split is what kept the prop surface
at three (`folio`, `variant`, `icon`), avoiding the flag explosion the Consequences warned about.
The superseded per-view classes were removed from the four CSS modules.

Where the old copies disagreed on a value, the card variant picked one: the snippet clamps to two
lines and the folder is right-aligned in both callers. (The folder eyebrow initially kept
`--fs-small` from the old code; see the design revision below — that token does not exist.)

**Deviation from the Decision:** the sidebar was left alone. It is listed above as a fifth
surface and as a candidate variant, but it renders the title and nothing else, so there is no field
set to share — routing it through `EntryContent` would be indirection wrapping a single expression.
The unification is therefore four surfaces into one component, not five.

**Verification.** 19 unit tests in `folioSearch.test.ts` pin every scoring tier and the
`rankFolios` ordering (128 tests total). The 8 existing `ProjectStore.search()` tests were kept
rather than moved, as the Consequences suggested they might be: they now cover the store's wiring —
index source and top-20 limit — while the tier contract is tested directly in `packages/shared`.
React components remain untested per the `AGENTS.md` policy, so all four surfaces were additionally
checked in a real browser against `fall-of-troy` (folio header, category rows, Grand Index entries,
header dropdown; alias and tag queries in both index views).

### Layout revision (same day)

The first cut placed aliases inline after the title in the `row` variant and on their own line in
the `card` variant. Both were wrong, and reviewing the rendered result found a pre-existing fault
underneath:

- **`row`: the name column is now a fixed 200px, with aliases stacked beneath the name.** An inline
  alias widened the name cell by a variable amount, so the description column started at a
  different x on every row — five distinct positions across seven rows in the Humans index. The
  old `min-width: 140px` had only ever *looked* like a column because no title exceeded it; the
  longest title in the sample project renders at 174px, so the Events index was already ragged
  before aliases existed. 200px clears every title measured, and anything longer wraps inside the
  column instead of shifting the description. Both indexes now have a single description offset.
- **`card`: the alias rides on the title line, truncating with an ellipsis when space is tight.**
  On its own line it made aliased cards taller than unaliased ones, and because the Linked Mentions
  grid stretches items to the tallest in each row, one aliased card padded out its whole row. Card
  heights are now uniform. Truncation is acceptable here because the folio page shows the full
  alias list; the folio header itself never truncates.

Flex baseline alignment keeps working in the `row` case: a flex item's baseline is that of its
first line, so the description still sits on the title's baseline and the stacked alias hangs below.

### Design revision — index idiom and type scale (same day)

The two earlier layout attempts were both judged bad on review. Stress-testing with adversarial
data — a 52-character title, a four-alias entry, an entry with no snippet, an entry with nothing —
rather than the sample project's happy path found three separate faults:

- **The fixed 200px name column was fitted to sample data.** It was chosen because the longest
  title in `fall-of-troy` measured 174px, which is a property of that project, not of the design.
  Under adversarial titles it wrapped to three lines and broke alignment anyway, producing five
  distinct row heights. Replaced with a content-relative `clamp(9ch, 22%, 24ch)`: `ch` tracks the
  type size, the percentage tracks the viewport, and because the width is content-independent every
  row aligns by construction — no subgrid, no measurement pass.
- **Card titles clipped with no ellipsis and collided with the folder eyebrow.** `cardTitle` had
  `white-space: nowrap` inside an `overflow: hidden` heading but no `text-overflow`, so a long title
  was hard-cut mid-glyph and ran into the folder label. Only a title longer than any in the sample
  project triggered it. The title now ellipses, and the alias yields its space first so the name —
  the thing that identifies the entry — truncates last.
- **The card type scale was entirely flat.** `--fs-small` is not a defined token, so
  `font-size: var(--fs-small)` fell back to `inherit` and title, alias, folder and snippet all
  rendered at 16px. This predated ADR-0011 (it came from `BacklinksPanel` and `TopHeader`) and was
  inherited when those were consolidated. Now 16 / 15 / 11 / 13.5px against real tokens.
  `TagFilter.module.css` still carries the same bug and is left for a separate change.

**Index rows are now one line, always:** name column, then a single gloss line carrying the snippet
(or tags when there is no snippet). Overrun ellipses. Truncation therefore lands on the gloss — the
least load-bearing content — instead of on the title. Verified with adversarial rows injected into
the live Humans index: one row height, one gloss column position, no horizontal overflow.

**The row/card idiom split is deliberate and is now documented** in `docs/design-system.md`. A card
previews an entry that arrived unsorted; an index line supports scanning a known alphabetical list.
Rendering the index as cards was prototyped and rejected — it loses A–Z scanability and reintroduces
uneven heights, since cards without snippets are shorter. What the two idioms share is the type
scale, not the layout.

### Aliases dropped from both index views

Aliases render only on the folio header, the search dropdown, and Linked Mentions. Both index views
(`row` and `inline`) show the title alone. An index is sorted and scanned by title, so an alias
sitting in that column is noise in the exact place the eye is running down; the surfaces that keep
it are the ones where you are identifying an entry rather than locating a known one. Alias
*matching* in search is unaffected — `folioSearch` still scores aliases, so typing an alias into
either index still finds the folio, it just does not display the alias in the result.
