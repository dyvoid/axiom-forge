# 3. In-Memory Document Model

**Date:** 2026-06-05
**Status:** Superseded by [ADR-0010](0010-multi-file-write-safety.md)

> **Note:** Never implemented. This ADR bundled two separable decisions — a safe multi-file
> write path and an in-memory content cache. [ADR-0010](0010-multi-file-write-safety.md) takes
> the former and declines the latter: the cache's only named consumer was ADR-0004, which was
> revised to a display-first design that needs no cached content. The Context below remains an
> accurate statement of the problem; the Decision is what was replaced.

## Context

`ProjectStore` maintains a metadata-only index (`InternalFolioRecord[]`) built at startup:
titles, tags, snippets, outgoing links, and file paths. Full structured content (`sections`,
field values) is not cached — `getFolio()` reads and re-parses the file from disk on every call.

This has two consequences:

- **No content-level queries.** Finding all Characters whose `parent` field points at a given
  entry requires reading and parsing every file. The index alone cannot answer relational
  questions.
- **Awkward multi-file mutations.** Operations that must atomically update several files (e.g.
  writing a back-reference into a target folio) require a per-file read-modify-write loop with
  no shared transactional context.

The rename/link-rewrite feature already performs batch multi-file writes but has no per-file
mtime conflict detection on the files it rewrites — a latent hole in the current design.

## Decision (superseded)

Evolve `ProjectStore` to hold fully parsed folio content alongside its index metadata, with
dirty-tracking and a batched flush, replacing the "read fresh on every `getFolio` call" safety
with mtime-based staleness detection at write-back time. A file watcher was considered and
deferred; a stale-mtime flush was to fail hard rather than auto-merge.

[ADR-0010](0010-multi-file-write-safety.md) closes the multi-file write hole without the cache,
keeping read-freshness and making the deferred-watcher question moot. See its Consequences for
what the trade cost and what it preserved.
