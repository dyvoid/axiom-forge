# 3. In-Memory Document Model

**Date:** 2026-06-05  
**Status:** Proposed

## Context

`ProjectStore` currently maintains a metadata-only index (`InternalFolioRecord[]`) built at
startup: titles, tags, snippets, outgoing links, and file paths. Full structured content
(`sections`, field values) is not cached — `getFolio()` reads and re-parses the file from disk
on every call.

This has two consequences:

- **No content-level queries.** Finding all Characters whose `parent` field points at a given
  entry requires reading and parsing every file. The index alone cannot answer relational
  questions.
- **Awkward multi-file mutations.** Operations that must atomically update several files (e.g.
  writing a back-reference into a target folio) require a per-file read-modify-write loop with
  no shared transactional context.

The rename/link-rewrite feature already performs batch multi-file writes but has no per-file
mtime conflict detection on the files it rewrites — a latent hole in the current design.

## Decision

Evolve `ProjectStore` to hold fully parsed folio content alongside its existing index metadata.
Add dirty-tracking so the store knows which records have been mutated since load. On flush,
re-serialize and write back only the dirty records.

Replace the "read fresh on every `getFolio` call" safety with **mtime-based staleness detection
at write-back time**: before flushing a dirty record, `stat()` the file and refuse if the
on-disk mtime has advanced beyond the cached value.

No new runtime dependency is introduced. This is an extension of the existing `ProjectStore`
class, not a new subsystem.

## Consequences

- Content-level queries become possible directly against the in-memory model without reading
  additional files.
- Multi-file mutations (e.g. bidirectional field patching per ADR-0004) can be expressed as
  in-memory mutations followed by a single batched flush with consistent mtime checks across
  all touched files.
- The "read fresh" guarantee is removed; staleness is enforced at write-back instead. External
  edits made between load and flush will produce a conflict error rather than silent data loss.
- A file watcher (e.g. `chokidar`) would improve live responsiveness to external edits but is
  not required for correctness and would add a dependency — suitable as a follow-on decision.
- Startup time is unchanged (the index already parses every file at load).
