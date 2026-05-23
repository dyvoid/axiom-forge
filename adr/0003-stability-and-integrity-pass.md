# 3. Stability and Integrity Pass

**Date:** 2026-05-23
**Status:** Proposed

## Context

A first-principles review of the codebase surfaced a cluster of issues that share a single underlying problem: several of the stated architectural invariants (single source of parsing logic, Obsidian-compatible rendering, docs reflect current code, server state syncs to client) are not actually enforced. The result is silent data drift, partial features advertised as complete, and a few duct-taped workarounds masking deeper asymmetries.

Rather than fixing these one at a time — which risks introducing inconsistencies between fixes and would touch the same files repeatedly — this ADR groups them into a single coordinated pass with a deliberate execution order.

## Decision

We will land the following changes, in the order listed. The ordering matters: later items depend on earlier ones.

### Phase 1 — Foundations (must land first)

**1.1. Replace the hand-rolled markdown renderer with `markdown-it`.**
`packages/client/src/utils/markdown.tsx` will be deleted. We will add `markdown-it` as a client dependency and configure it with a custom plugin that delegates wiki-link parsing to `shared/wikilink.ts`. The wiki-link plugin emits a token the renderer maps to the existing `<WikiLinkChip>` React component. This restores the "all parsing logic lives in `shared/`" rule (`.ai-rules.md` §4) and closes the rendering fidelity gap (H3, blockquotes, fenced code, tables, horizontal rules).

**1.2. Unify the broken-link walker in `shared/`.**
The near-duplicate walkers in `server/routes/folios.ts` (`collectBrokenLinks`) and `client/utils/links.ts` (`collectUnresolvedLinks`) become one function in `shared/`, parameterised on an `exists(folder, name) => boolean` predicate. Both call sites import the shared walker.

**1.3. Make the Sync button actually sync.**
`ProjectContext` will move from a one-shot `useEffect` fetch to `useQuery` hooks for `config` and `schema`, with `staleTime: Infinity`. The Sync button's `queryClient.invalidateQueries()` call will then naturally refetch them along with everything else. Without this, every subsequent fix that relies on schema/config consistency is undermined mid-session.

### Phase 2 — Server correctness (depends on Phase 1.3)

**2.1. Await the write mutex.**
Every write route in `routes/folios.ts` changes from `writeMutex.runExclusive(async () => …).catch(…)` to `await writeMutex.runExclusive(async () => …)` with a surrounding try/catch. The response is then sent before the handler returns, restoring Express's normal lifecycle assumptions.

**2.2. Replace the rename dance with `fs.rename` and add rollback.**
The current "write new file → unlink old" pattern in the PUT rename branch is not atomic and can leave duplicate files on disk if `unlink` fails. Replace with a direct `fs.rename(oldPath, newPath)` followed by serialised write. If any post-rename step fails (link rewrite, etc.), the operation is logged and the user is informed; we do not silently leave the project in an inconsistent state.

**2.3. Surface parse errors from `buildFolioIndex`.**
The silent `catch {}` in `projectStore.ts` becomes a real warning: the folio is still indexed, but the failure reason is added to its `warnings` array so it shows up in `/api/warnings` and the warnings dialog.

**2.4. Include tags in search scoring.**
Add tag matching to the `/api/search` scorer in `routes/index.ts` with appropriate weight (proposal: equal to title.includes, ~10 points).

**2.5. Remove the redundant double-update in PUT.**
The two-step `updateFolioRecord` pattern (once after write, once after re-stat) collapses to one. The parser+serializer pair is trusted to round-trip; if a round-trip discrepancy is later found, it is fixed in the parser, not patched over with a re-read.

### Phase 3 — Schema and validation (depends on Phase 2)

**3.1. Tighten `SectionDefSchema` to a discriminated union.**
Today's `refine` allows nonsensical combinations like `{ role: 'meta', type: 'textarea' }`. Replace with a discriminated union that encodes: `role: 'meta'` ⇒ has `fields`; `role: 'prose'` ⇒ has `type: 'textarea'`; section-level `type` ∈ `{textarea, wikilink-list}` only.

**3.2. Either emit or remove the `wrong-shape` validation code.**
`validateAgainstSchema` declares this code but never emits it. Audit what shape mismatches are possible (e.g. wikilink-list field containing strings) and emit `wrong-shape` for them; or, if all such cases are caught by the Zod structural pass, remove the code from the declared union.

**3.3. Remove the orphaned `theme.accent` from `ConfigSchema`.**
Until ADR 0001 is accepted and implemented, `theme.accent` should not exist in the type system. Remove. (When ADR 0001 lands, the full theme system is added at once, not via type-system stubs.)

### Phase 4 — Documentation and cleanup

**4.1. Purge Status from the Meta block, top to bottom.**
Status was never implemented in the Meta block. Remove the claim from `docs/Data_Model.md` (the example folio and the prose around it), remove the `status: undefined` field from the folio object constructed in `Sidebar.tsx`, and confirm no other reference exists. Single coordinated change to prevent the ghost from re-appearing.

**4.2. Fix or remove misleading comments.**
- `routes/folios.ts:180-186` — delete the stream-of-consciousness comment about adding `getBacklinks`.
- `routes/folios.ts:225-226` — replace the NTFS comment with the real reason for the 5ms slop (Node `mtimeMs` precision on Windows).
- `routes/FolioRead.tsx` — remove the "placeholder for now" docstring.

**4.3. Replace `JSON.stringify`-on-every-render dirty check.**
`FolioEditView` currently runs `JSON.stringify(draft) !== savedSnapshot` on every render, which scales O(folio-size) with every keystroke. Replace with a dirty flag set inside the state-update functions (`setDraft`, `updateField`, `patchSection`, `setTags`, `setTitle`) and cleared on save success.

**4.4. Update `docs/Architecture.md` to mention tag-based search.**
Now that tag search is implemented (Phase 2.4), the existing claim in the docs becomes accurate. Confirm wording.

**4.5. Gitignore `packages/shared/dist/`.**
The directory is built by the `prepare` script on `npm install`, so committing it creates spurious diffs on every install. Add to `.gitignore` and remove from the repo.

### Explicitly out of scope

**Folio ID stability.** The roman-numeral "Folio XLII" eyebrow is visual sugar, not an identifier. It is reassigned on every reload because IDs are alphabetical position, not stable identity. We accept this and document it as ornamentation in `docs/Design_System.md` — the ID is a visual flourish in the print aesthetic, not a referent users should write down. This avoids the cost of a stable-ID system (sidecar files or `config.json` entries) for a feature that doesn't need one. If users ever start citing folio numbers as if they were stable, revisit.

**Section-level field types beyond `textarea` and `wikilink-list`.** Phase 3.1 encodes the current de facto restriction into the schema. Expanding section-level types is a separate decision and not part of this pass.

## Consequences

- **Coordinated risk:** Phase 1 changes are wide (markdown renderer, context refactor, shared utility move). All three should land together or all be reverted together — partial application leaves the codebase worse than the starting state.
- **`markdown-it` adds a client dependency.** Bundle impact ~80kb (gzipped ~25kb). Acceptable for a local-only desktop-class tool.
- **Rendering changes will surface latent prose-formatting bugs** in existing folios that relied on the hand-rolled renderer's quirks. We accept this — the new renderer matches Obsidian's behaviour, which is the stated source of truth.
- **The Sync button refetch in 1.3 may briefly flash the loading state** for the entire UI when schema/config change. Acceptable; it is the honest representation of what "reload from disk" means.
- **No data migration needed.** All changes are code-only — the on-disk markdown format is unchanged.
- **Docs and code converge on a single truth.** After this pass, `.ai-rules.md` §1 ("docs describe what the code does") and §4 ("single source of parsing logic") are actually enforced by the code, not just stated.
