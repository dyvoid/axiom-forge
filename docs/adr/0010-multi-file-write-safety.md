# 10. Multi-File Write Safety

**Date:** 2026-07-30
**Status:** Accepted — not yet implemented

> **Note:** Supersedes [ADR-0003](0003-in-memory-document-model.md), which bundled two
> separable decisions — an in-memory content cache and a safe multi-file write path. This
> ADR takes the second and declines the first.

## Context

Renaming a folio rewrites every `[[folder/oldName]]` wikilink across the project. That is a
multi-file write, and it is currently unguarded: `ProjectStore.saveFolio` carefully compares the
primary file's on-disk `mtime` against the client's before writing, but
`rewriteProjectLinks` reads, rewrites, and writes every *other* matching file with no staleness
check at all. An external edit to any of those files — the Obsidian workflow the project
guarantees — is silently overwritten. This is a live data-loss hole, present today, independent
of any planned feature.

ADR-0003 proposed to fix this by evolving `ProjectStore` to hold fully parsed content for every
folio, with dirty-tracking and a batched flush. Two distinct things were bundled into that
decision:

1. **A safe multi-file write** — the ability to write several files as one operation with a
   staleness check on each.
2. **An in-memory content cache** — holding every folio's parsed sections and field values in
   RAM, replacing the current read-and-parse-per-call in `getFolio`.

Only the first is needed to close the hole. The second was justified by enabling content-level
relational queries, whose only named consumer was ADR-0004 (Bidirectional / Inverse Fields).
ADR-0004 has since been revised to a display-first design that runs on the existing link index —
metadata the store already holds in memory — and therefore no longer needs a content cache.

The cache also carries a cost that ADR-0003's resolution note accepted without a mitigation.
Today `getFolio` re-reads from disk on every call, so an entry edited externally shows its new
content as soon as you navigate to it (`useFolio` sets no `staleTime`, so it refetches on mount).
Caching content removes that. With the file watcher deferred — as ADR-0003 resolved — an external
edit becomes invisible until a save attempt fails with a hard conflict, at which point the user
must redo the edit. A manual escape hatch does exist — the header's sync button calls
`POST /api/reload` and invalidates every query — but it is a deliberate, project-wide action,
where today freshness is automatic and per-entry. That is still a net regression in the Obsidian
round-trip, which `AGENTS.md` lists as a product guarantee, just a recoverable one.

## Decision

Close the multi-file write hole directly, and do not introduce a content cache.

- **Batch write helper in `ProjectStore`.** Restructure the rename link-rewrite into three
  phases: read every candidate file and compute its rewritten content; verify each target's
  current on-disk `mtime` against the value cached in the index; only then write. A mismatch on
  any target aborts the whole batch before the first write, and the rename fails with a conflict
  error naming the file that changed.
- **No in-memory content cache.** `getFolio` continues to read and parse from disk per call.
  Read-freshness is preserved, no file watcher is required, and the app cannot hold a view of a
  file that disagrees with disk.
- **Residual window is accepted.** Verifying all mtimes and then writing leaves a small
  check-to-write gap. Individual writes remain atomic (`writeFolioFile` uses tmp+rename), so the
  failure mode is a torn *batch*, never a torn file. Closing that gap fully would require
  file locking, which is out of scope for a single-user local tool.

## Consequences

- The rename data-loss hole closes with no new subsystem, no new dependency, and no change to
  the save contract for single-file writes.
- Read-freshness is retained, so external edits stay visible and the app never diverges from
  disk. The deferred-watcher question ADR-0003 raised becomes moot rather than deferred.
- Content-level relational queries remain unavailable. No planned feature needs them. If one
  genuinely does, it warrants a new ADR that prices the staleness cost explicitly — and should
  consider a `stat`-gated re-read (re-parse only when `mtime` advanced) before a full cache.
- A partial rewrite is still possible if a write fails mid-batch. Errors already surface via
  `LinkRewriteFailedError`; this ADR narrows the window rather than eliminating it.
- The `Map`-lookup housekeeping item, parked in ADR-0003 pending a data-structure rewrite, is
  unblocked and independent again. It remains low priority — the linear scans are over tens of
  records.
- ADR-0003 is superseded. Its Context remains an accurate description of the problem; only its
  chosen solution is replaced.
