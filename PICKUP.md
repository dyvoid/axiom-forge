# PICKUP

Where the last session left off. Update this when you stop, so the next session starts with context
instead of archaeology. For the feature backlog, see [docs/ROADMAP.md](docs/ROADMAP.md).

## Design review — round 2: nine polish fixes shipped

Continuation of the impeccable-skill design review. Round 1 shipped four mechanical
fixes (faux-bold index titles, dead Cinzel, Grand Index column-major flow, meta value
column width) and is merged to `main`. Round 2 addresses the remaining findings from
the review, one commit each, on branch `fix/design-polish-round-2`:

1. **Grand Index title italic → upright.** The Grand Index title was the only one of
   three display titles (folio, category, grand index) that slanted. Now all three are
   upright Cormorant — italic can resume meaning editorial voice.
2. **Folio double rule made visible.** `FolioReadView.divider` (a signature print-idiom
   double rule) used `--border-soft` which is too close to the parchment background to
   register. Switched to `--border`.
3. **Gold eyebrow contrast fixed.** Folio header and category index eyebrows used
   `--accent-gold` (#9a7a2c, ~3.1:1 on parchment — below WCAG AA for 11px text). Changed
   to `--text-muted` (#6c5e46, ~5.0:1), which the design doc already assigns to eyebrow
   text. Gold is kept for type icons (large enough not to need AA).
4. **Keyboard focus-visible indicator.** No `:focus-visible` existed anywhere; inputs
   had `outline: none` with only a border-color shift, and links/buttons had no focus
   styling at all. Added a global `:where(...):focus-visible` rule in `base.css` with a
   2px `--accent-rust` outline and `!important` to override module-level `outline: none`.
5. **Cool-gray overlays → warm tints.** Five spots used `rgba(0,0,0,...)` (neutral black)
   on the warm parchment palette, where it reads as grime. Replaced with warm
   equivalents: `--bg-hover` for sidebar hover, `rgba(34,27,19,...)` for shadows and
   dialog overlays, `rgba(138,53,34,0.05)` for the CxSelect menu hover.
6. **Hardcoded font sizes → tokens.** Six CSS modules hardcoded pixel sizes instead of
   referencing tokens. Replaced exact matches (`20px`→`--fs-body-lg`, `18px`→
   `--fs-subtitle`, `16px`→`--fs-body`, `13px`→`--fs-eyebrow`, `14px`→`--fs-label`,
   `0.3em`→`--ls-sidebar-group`). Added two new tokens for genuinely distinct scales the
   system lacked: `--fs-subtitle-lg` (24px, folio subtitle) and `--fs-hero-xl` (112px,
   landing hero title).
7. **Epithet chips → print-style italic run.** `MetaSection.textChip` rendered text-list
   values as rounded gray lozenges (`border-radius: 4px`, black-alpha fill) — dashboard
   vocabulary. Replaced with `.textItem`: inline italic Spectral with middot separators,
   matching the folio header's alias/tag idiom. Also removes the last
   `rgba(0,0,0,...)` overlay in the client.
8. **Duplicate search on Grand Index.** The header's global search was always visible,
   duplicating the Grand Index's own search + tag filter. Header search now hides on
   `/index` via `useLocation`. The global `/` keyboard shortcut is also gated so it
   doesn't swallow `/` on the Grand Index page.
9. **Inverted font token names corrected.** `--ff-display` pointed to Spectral (the body
   face) and `--ff-serif` pointed to Cormorant (the actual display face) — the names
   were backwards. Fixed: `--ff-display` is now Cormorant, `--ff-body` stays Spectral,
   `--ff-serif` is removed. All 31 references across 19 files updated. Zero visual
   change — the same font loads at every site. `docs/design-system.md` updated to
   document the token mapping.

130 tests pass, lint clean, build succeeds. ADR-0011 re-checked: it doesn't reference
font token names, so the rename doesn't affect its content.

### Still open from the design review

- **Zero `@media` queries.** The entire client has no responsive behavior. An 88px folio
  title, a fixed 240px sidebar, and a fixed 280px meta column break any window under
  ~1100px. This is a larger piece of work — a responsive breakpoint strategy — and was
  deliberately deferred from this batch.
- **Italic overuse.** Placeholders, buttons, tags, aliases, snippets, and the landing
  title are all italic. The Grand Index title was fixed (round 2, fix 1), but italic
  still does too many jobs elsewhere. Needs a deliberate pass deciding what italic means
  in this design (editorial voice? placeholder hint? secondary metadata?) and routing
  the rest to upright.
- **WebGL smoke on the landing.** The one expressive gesture reads as flat parchment in
  the screenshot. Deferred per user instruction — either dial it up until it registers
  or cut it.

The `TagFilter.module.css` `--fs-small` bug mentioned in the previous session was
already fixed — the only remaining reference is in a comment in `EntryContent.module.css`
explaining the history.

## Design review — round 1: four polish fixes shipped

An impeccable-skill design review ran on the client: file scan (the 59 deterministic rules found
nothing — a clean scan, not a clean bill of health), source reading of every CSS module, and
evaluation of the three tracked screenshots in `docs/screenshots/`. The aesthetic direction is
committed and coherent (parchment, Spectral/Cormorant, double rules, drop caps) — this is not a
"bolder" candidate. The problems were in typographic execution and craft discipline.

**Four mechanical fixes shipped**, one commit each, merged to `main`:

1. **Faux-bold index row titles.** `EntryContent.rowTitle` used `font-weight: 700` on Cormorant
   Garamond, but `index.html` only loads 400/500/600 — every category-index row got a synthesized
   faux bold. Dropped to 600.
2. **Dead Cinzel payload.** `index.html` loaded three weights of Cinzel that no source file
   references. Removed from the render-blocking font CSS.
3. **Grand Index flowed row-major.** Letter groups laid out A/D across the top row, F/G on the
   next — the alphabetical spine zigzagged. Switched `indexColumns` from `flex-wrap` to CSS
   multi-column (`column-width` + `break-inside: avoid`) for column-major flow. Documented in
   `docs/design-system.md`.
4. **Meta field values had no room.** `MetaSection.field` reserved a fixed 170px for labels inside
   the 280px meta column, leaving ~94px for values — long values wrapped into 3+ ragged lines.
   Label column is now `minmax(0, max-content)`, sizing to actual labels and giving the value the
   remainder (~160px).

**Screenshot discrepancy found.** `docs/screenshots/folio.jpg` shows meta values right-aligned and
ragged-left, but no `text-align: right` exists anywhere in `MetaSection.module.css` history (verified
via `git log` on that file). The screenshot was likely captured from a state with uncommitted local
changes that never landed. Fix 4 targets the cramped-wrap reality that actually ships, not the
stale symptom in the screenshot.

## Repo checks + six shipped token bugs

`npm run lint` now also runs `scripts/check-repo.mjs`. It was written to answer "which GitHub
Actions are worth adding", and the answer turned out to be *none* — the useful checks belong inside
`lint` and `test`, which CI already runs, so a failure reproduces locally instead of only on a PR.

It found **six design tokens referenced but never defined**. An undefined `var(--…)` is invalid at
computed-value time, so the declaration is dropped silently — invisible to ESLint and to the type
checker. `--bg-hover` meant hover on Linked Mentions cards and the search-dropdown highlight did
nothing whatsoever; `--ff-mono` meant monospace never applied; `--fs-small` was the one that
flattened the card type scale. Fixed by pointing four at tokens that already existed
(`--bg-surface`→`--bg-panel`, `--text-danger`→`--accent-rust`, `--bg-subtle`→`--bg-panel`,
`--fs-small`→`--fs-meta`) and defining the two the system genuinely lacked (`--bg-hover`,
`--ff-mono`). Verified in a browser: card background now shifts on hover, where before it was
identical.

The checker also covers dead relative Markdown links, `fall-of-troy` wikilinks outside the
deliberate allowlist, and ADRs missing from the ROADMAP.

**Two new tests** in `schema.test.ts` parse and round-trip every `fall-of-troy` Markdown file. The
existing smoke test only ever validated `config.json` and `schema.json` — no `.md` file was parsed
by anything, so sample content could drift from the schema with the suite green. The round-trip
comparison is deliberately order-insensitive: `serializeToMarkdown` rewrites fields into schema
declaration order, which is intended normalisation, and `Humans/Helen.md` (Spouse before Divine
Patron) is the live case that proves it.

CI triggers were left alone at PR + main, as requested.

## Next Up

Recommended order, with the reasoning so it does not need re-deriving:

1. **[ADR-0010] Multi-File Write Safety** — the only open item that closes a *live data-loss path*.
   Renaming an entry rewrites every file linking to it, and `rewriteProjectLinks` writes all of them
   with **no mtime check**, while `saveFolio` carefully guards the single file being edited. An
   external edit to any linking file is silently overwritten. Server-only, Accepted, no pending
   design decisions, and it fits the existing integration-test pattern (real temp project, real I/O).
2. **[ADR-0009] Consolidate Folio Validation Rules** — Accepted and self-contained, but modest
   payoff: roughly 25 lines and four message strings against a new module. It changes user-visible
   warning wording, so the four parser tests asserting those strings need updating.
3. **[ADR-0004] Bidirectional / Inverse Fields** — Accepted but **blocked on three open items** (see
   the ADR). Two are decidable without the user (skip dangling targets; let broken-link detection
   handle deletions). The third is a product call: should the save-time prompt also offer to *clear*
   an inverse when a link is removed, or handle additions only?

Small and unclaimed: `TagFilter.module.css` still uses the undefined `--fs-small` token (same defect
that flattened the card type scale — see `docs/design-system.md`). One word to fix.

## Current Focus

**[ADR-0011] Unify Entry Cards & Ranking — implemented.** The consolidation behind the card
inconsistency is done, and it fixed a real behaviour bug on the way.

- **Shared ranking** in `packages/shared/src/folioSearch.ts`: `scoreFolio` (per-record score, 0 =
  no match) and `rankFolios` (score, filter, sort with alphabetical tie-break).
  `ProjectStore.search()` is now `rankFolios(...).slice(0, 20)`; the two client index views call
  the same function. Three divergent scorers became one.
- **Two intended behaviour changes:** the index views now score **tags**, and the category index
  now scores **folder paths** — both previously server-only. Searching the tag `strategist` in the
  Grand Index returned nothing before and now returns Odysseus.
- **Shared presentation** in `packages/client/src/components/ui/EntryContent.tsx`, variants
  `card` / `row` / `inline`. It renders content only, never a wrapper — callers keep their own
  `Link`/`NavLink`/`div` plus hover, active, highlight and grid styling. That kept the prop surface
  at three and avoided the flag explosion ADR-0011 warned about. Superseded classes deleted from
  four CSS modules.
- **Sidebar deliberately excluded** — it renders the title alone, so there is nothing to share.
  Four surfaces unified, not five; recorded as a deviation in the ADR.
- **Ordering stayed with the callers** by design: Grand Index groups alphabetically by letter,
  category index keeps index order and uses score only as a filter.

128 tests pass (19 new in `folioSearch.test.ts` pinning every tier and the ranking order). The 8
existing `ProjectStore.search()` tests were kept rather than moved — they now cover store wiring
while the tier contract is tested in `packages/shared`. Build and lint clean. Since React
components are untested by policy, all four surfaces were checked in a real browser against
`fall-of-troy`, including alias and tag queries in both index views.

**Entry design reworked after a stress test** (third and current iteration — the first two were
judged bad on review). Testing with adversarial data instead of the sample project's happy path —
a 52-character title, a four-alias entry, an entry with no snippet, an empty entry — found three
faults:

- **The 200px name column was fitted to sample data.** It came from measuring the longest title in
  `fall-of-troy` (174px), which is a fact about that project, not about the design. Under long
  titles it wrapped to three lines and broke alignment anyway — five distinct row heights. Now
  `clamp(9ch, 22%, 24ch)`: `ch` tracks type size, `%` tracks viewport, and since the width doesn't
  depend on content, rows align by construction. No subgrid, no measurement pass.
- **Card titles clipped with no ellipsis and ran into the folder eyebrow.** `cardTitle` had
  `nowrap` inside an `overflow: hidden` heading but no `text-overflow`. Only a title longer than any
  in the sample project triggered it. Title now ellipses; the alias yields space first so the name
  truncates last.
- **The card type scale was completely flat — everything computed to 16px.** `--fs-small` is *not a
  defined token*, so `font-size: var(--fs-small)` falls back to `inherit`. Title, alias, folder and
  snippet were all identical size, which is much of why the cards felt unresolved. Predates this
  work (came from `BacklinksPanel`/`TopHeader`). Now 16 / 15 / 11 / 13.5px on real tokens.
  **`TagFilter.module.css` still has this bug** — left alone deliberately, its own change.

**Index rows are now one line, always:** name column, then a single gloss line with the alias as an
italic lead-in, an em-dash, then snippet (or tags if no snippet). Truncation lands on the gloss
rather than the title. Verified with adversarial rows injected into the live index: one row height,
one gloss column position, no horizontal overflow.

**The row/card idiom split is deliberate and now documented** in `docs/design-system.md`: a card
previews an unsorted entry, an index line supports A–Z scanning. Rendering the index as cards was
prototyped and rejected — it loses scanability and reintroduces uneven heights. The two idioms
share field order (name → alias → gloss) and the type scale, not the layout.

### Superseded second iteration

*(Kept for context; the stress test above replaced this.)* Alias layout revised after visual review,
because the first cut looked bad in the category index:

- **Category rows:** name column is now a fixed **200px** with the alias stacked *beneath* the
  name. Inline aliases widened the name cell per-row, so the description column started at five
  different x positions across seven rows. Measuring also turned up a **pre-existing** fault: the
  old `min-width: 140px` only looked like a column because no title exceeded it — the longest
  sample title renders at 174px, so the Events index was already ragged before aliases existed.
  Both indexes now have a single description offset (verified: 1 distinct position, was 5).
- **Cards:** the alias now rides on the title line and truncates with an ellipsis when tight. On
  its own line it made aliased cards taller, and the Linked Mentions grid stretches items to the
  tallest in a row, so one aliased card padded out its whole row. Card heights are now uniform
  (verified: 1 distinct height across 14 cards). The folio header still shows aliases in full and
  never truncates.

No horizontal overflow at a 900px viewport; no page errors. The faint `·` between multiple aliases
is `--border-soft`, the same token the tag separators use — light by design, not a bug.

### Earlier this session — aliases UI, ADR-0004/0010 accepted, ADR-0011 opened

**Aliases UI shipped; ADR-0004 and ADR-0010 accepted; ADR-0011 opened.**

- **Aliases now render and search consistently.** The design call was made: aliases appear under
  the folio title on folio pages ("also known as"), and as an `aka …` line on every entry surface
  that shows a snippet — header search results, Linked Mentions cards, category index rows, and
  Grand Index entries. Sidebar deliberately left alone (narrow nav, no search).
- **Alias search fixed on the index views.** Server-side search already scored aliases, but
  `GrandIndexView` and `CategoryIndexView` each carry their *own* copy of the scoring logic and
  neither knew about aliases — so "Ulysses" found Odysseus in the header and found nothing in
  either index. Both now mirror the server's alias tiers (exact 80 / prefix 40 / contains 8).
  Verified live against `fall-of-troy`: `/api/search?q=ulysses` returns Odysseus with
  `aliases: ["Ulysses"]` and resolvable `folder`/`name`. That contract is now pinned by an
  assertion in `routes/index.test.ts` rather than just the title check it had before.
- **ADR-0004 and ADR-0010 set to Accepted** (not yet implemented) at the user's call. ADR-0004
  still carries its three open items — settle those before building.
- **New [ADR-0011](docs/adr/0011-unify-entry-cards-and-ranking.md) (Proposed)** — entry cards look
  different in all five places they appear, and the root cause runs deeper than styling: there are
  **three independent implementations of folio ranking** (server `ProjectStore.search()`, plus a
  narrower copy in each of the two index views). Proposes a shared entry-card component and a
  shared scoring function in `packages/shared`. Cross-package, so it needs human review.
  The alias tiers added above are duplicated a third time on purpose — the minimal correct fix,
  with the consolidation tracked in 0011 rather than done as an unrequested refactor.
  *(That duplication is now gone — ADR-0011 was implemented later the same session; see
  Current Focus.)*

**Correction to the previous entry:** it claimed `POST /api/reload` had no client caller and was
unreachable from the UI. That was wrong — `TopHeader` has a sync button ("Reload project from
disk") that calls it and invalidates every query. ADR-0010's Context has been corrected. The
decision it supports is unchanged: the manual, project-wide sync is still a downgrade from today's
automatic per-entry freshness, and the content cache has no consumer either way.

109 tests pass; build and lint clean.

### Earlier this session — next-work validation pass

**Reviewed the queued features against the codebase before building any of them.** Two decisions
changed:

- **ADR-0003 (In-Memory Document Model) → Superseded, never built.** It bundled two separable
  things: a safe multi-file write, and an in-memory content cache. Only the first was needed. The
  cache's sole named consumer was ADR-0004, and its cost was real — caching content removes the
  read-fresh behaviour in `getFolio` that makes external Obsidian edits visible, and the watcher
  was already deferred, so external edits would have stayed invisible until a save conflict.
  `POST /api/reload` exists but no client code calls it, so the escape hatch was unreachable.
  Replaced by **[ADR-0010](docs/adr/0010-multi-file-write-safety.md)** (Proposed): pre-flight all
  targets, verify each `mtime`, then write — closing the hole that `rewriteProjectLinks` leaves
  today (it rewrites every linking file with no staleness check, while `saveFolio` guards only the
  primary file). No cache, no watcher, no new dependency.
- **ADR-0004 (Bidirectional / Inverse Fields) → revised in place, write-through to
  display-first.** Still Proposed. Inverse relationships are derived from the link index for
  display and written only on explicit confirmation, as ordinary single-file saves (a push prompt
  after saving the source, and a pull affordance on the target). Surveying
  `fall-of-troy/schema.json` found four relationship topologies — cross-type pairs
  (`Divine Patron` ↔ `Mortal Champions`), symmetric/self-inverse (`Spouse`), same-type field pairs
  (`Preceding`/`Succeeding Events`), and one-sided fields with no inverse to write to (`Children`,
  `Leader`, `Current Owner`) — plus two spec gaps in the old ADR: section-level lists can't be
  named by `"<Section>.<Field>"` paths, and `Allies` targets a type (`God`) that has no `Allies`
  field. Display-first handles all four; write-through could not handle the fourth at all without
  a `schema.json` change. The ADR-0003 dependency is gone.

The enabler is small: `walkFolioLinks` already yields `{ section, field? }` per link and
`extractAllLinks` throws it away. Keeping that location in the index is the only data change the
feature needs — no disk reads, backlinks stays an in-memory scan.

**Both ADRs are Proposed, so neither is startable until accepted.** ADR-0004 also carries three
open items (deletion cleanup, dangling targets like `Penelope`/`Diomedes` which have no files, and
whether the push prompt covers link *removals*). ADR-0009 is untouched and remains the one
Accepted, self-contained, ready-to-build item.

Also still outstanding and unrelated: the **aliases client UI** (see Previous Focus). Confirmed
still unbuilt — no reference to `aliases` anywhere in `packages/client/src`, though the data
already reaches the client and is scored in search. Blocked on a design call, not engineering.

109 tests pass; nothing was changed in `packages/`.

### Earlier — ADR-0003 / ADR-0009 open questions

**ADR-0003 and ADR-0009 unblocked (docs only, not yet built).** Resolved the open questions that
were gating both. *(ADR-0003's resolution is now moot — see Current Focus; it was superseded by
ADR-0010 before being built.)*

- **ADR-0003 (In-Memory Document Model):** watcher question resolved as *deferred* — ship without
  a file watcher; external edits surface as a write-time mtime-conflict error, not a live refresh.
  Conflict UX resolved as *hard error, no auto-merge* — reload and redo, no diff/merge flow.
  Status set to Accepted. Not yet implemented.
- **ADR-0009 (Validation Rule Engine):** resolved that the read-lenient/write-strict *behavior*
  split is intentional and stays; only the underlying rule *definitions* (duplicated between
  `parser.ts` and `schema.ts` for `unknown-type`/`unknown-section`/`unknown-field` and
  `invalid-select-value` — `schema.ts`'s `wrong-shape` check has no read-time counterpart at all)
  get unified behind one engine parameterized by severity. Status set to Accepted. Not yet
  implemented.

At the time, the plan was to build either next — ADR-0003 as the bigger lift said to unblock
ADR-0004 and the Map-lookup cleanup, ADR-0009 as the smaller self-contained one. The validation
pass above dissolved the ADR-0003 half of that: ADR-0004 turned out not to need it, and the
Map-lookup item is independent. ADR-0009 stands unchanged.

### Earlier — ADR-0007

**[ADR-0007] Shared Folio Walker — implemented.** `walkFolioLinks` added in
`packages/shared/src/folioWalker.ts`; `extractAllLinks` (moved out of `wikilink.ts`) and
`collectBrokenLinks` (`brokenLinks.ts`) are now visitors over it instead of hand-written
traversals. Public API unchanged — no caller updates needed in `projectStore.ts` or the client.
4 new tests in `folioWalker.test.ts` (109 tests total); build + lint clean. ADR-0007 set to
Accepted.

### Earlier — ADR-0006

**[ADR-0006] Encapsulate Folio Mutations — implemented.** All folio mutation orchestration moved
out of `routes/folios.ts` into `ProjectStore.saveFolio/createFolio/deleteFolio`; domain errors in
`storeErrors.ts`; thin route layer maps errors to status codes; mutex internalized; DELETE's
`unlink` now goes through `fileIO.deleteFolioFile`. ADR-0006 set to Accepted. 11 direct store
mutation tests added (105 tests total). Done on branch `task/encapsulate-folio-mutations`.

This unblocks **ADR-0003 (In-Memory Document Model)** — the natural next architectural step (note
my standing caveat: 0003's read-staleness gap + the watcher question should be resolved before it's
built; see the architecture discussion).

Also this session: **ADR-0007 split** into the shared walker (0007) + validation rule engine
(new [ADR-0009](docs/adr/0009-consolidate-folio-validation-rules.md)).

### Earlier this session — tech-debt batch
A maintenance pass from an external audit (commits `f247e6a`, `6c15cbf`, `96490ae`): dedup
`isWikiLink`, route PUT rename through `fileIO`, surface create-mutation errors, memoize Sidebar
grouping, add config/schema route tests, return real save warnings. #9 (Map lookups) deferred to
ADR-0003.

### What is done (this session)
- **#1** `isWikiLink` deduplicated — exported from `wikilink.ts`, reused in `brokenLinks.ts`.
- **#3/#7** PUT rename now routes through `fileIO.renameFolioFile` (was a direct `node:fs/promises`
  `rename`); the previously-dead `renameFolioFile` export is now wired up. This is the interim
  step toward ADR-0006 (still *Proposed* — mutations not yet moved into `ProjectStore`).
- **#4** `createStub`/`createAndEdit` failures now surface via a "Create failed" banner in
  `FolioEditView` (were silently swallowed).
- **#8** `Sidebar` `byType` grouping memoized with `useMemo`.
- **#5** Integration tests added for `GET /api/config` and `GET /api/schema`.
- **#6** PUT/POST save responses now return *real* parse warnings (was hardcoded `[]`) via a
  serialize→parse round-trip (no extra disk read), also stored on the index record so
  `GET /api/warnings` stays accurate. Canary tests assert clean round-trips stay empty.
- **#2** (search in route handler) was already fixed before this session.
- **#9** (Map-based store lookups) deliberately **deferred to ADR-0003**.
- 94 tests pass; build + lint clean. Verified live against `fall-of-troy` (landing + edit view).

---

## Previous Focus

**[ADR-0008] YAML Frontmatter for Metadata** — implementation **complete and merged to `main`**
(commits `834f926`, `c71b570`, `e4ba8ad`, then follow-ups `b21b138`, `e9b987e`, `e7512a2`).
All work is on `main`; the original `task/yaml-frontmatter-metadata` branch can be deleted.

### What is done
- ADR-0008 written and accepted; ROADMAP updated.
- `js-yaml` added to `packages/shared`.
- `aliases` field added to `ParsedFolio`, `FolioIndexRecord`, and `ParsedFolioSchema`.
- Parser/serializer rewritten: `## Meta` replaced with YAML frontmatter.
- Wikilink rewriter gained frontmatter guard.
- Server propagates `aliases` through index, save, create, and search.
- All 27 `fall-of-troy/` files rewritten to frontmatter.
- `docs/data-model.md` updated with format spec + frontmatter parse-error contract.
- **Parser hardening (post-merge):** malformed YAML throws (surfaced as warning at
  index time, 500 at read time); valid-but-non-mapping YAML warns. Two tests pin
  both behaviors as intentional.
- **Search extraction (housekeeping):** scoring logic moved from the `/api/search`
  inline handler into `ProjectStore.search()`. Direct unit tests in
  `packages/server/src/projectStore.test.ts` (8 tests). ROADMAP housekeeping item
  checked off.
- 90 tests pass across all packages.

### What remains
- **Client UI: render aliases in sidebar / detail view / search results.**
  `aliases` already flows to the client via `FolioIndexRecord` and the full `ParsedFolio`.
  This is a purely presentational addition — no backend or format changes needed.
  The design call (where to show them, how to style) is the only blocker.

### Next session can begin by
1. Deciding where aliases should appear (sidebar chips? detail subtitle? search highlight?).
2. Wiring the React components to render the already-available `aliases` array.

---

Last updated: 2026-07-30
