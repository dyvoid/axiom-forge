# PICKUP

Where the last session left off. Update this when you stop, so the next session starts with context
instead of archaeology. For the feature backlog, see [docs/ROADMAP.md](docs/ROADMAP.md).

## Current Focus

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
