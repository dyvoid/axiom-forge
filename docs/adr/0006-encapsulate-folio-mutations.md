# 6. Encapsulate Folio Mutations

**Date:** 2026-06-05  
**Status:** Proposed

## Context

The server architecture separates data access (`ProjectStore`) from HTTP delivery (`routes/folios.ts`). Currently, `ProjectStore` is deep for reads (handling parsing and index building) but shallow for writes.

Methods like `addFolioRecord` and `updateFolioRecord` on the store are bare array mutations. All the real domain logic for writing — acquiring the global `writeMutex`, detecting mtime conflicts, converting titles to filenames, performing atomic writes, orchestrating project-wide wikilink rewrites, and deriving snippets — lives in the HTTP route handler.

This leads to several architectural issues:
- **Leaked Domain Logic:** The HTTP layer acts as the domain orchestrator, making it ~340 lines long and highly complex.
- **Bypassed Seams:** The route handler imports `node:fs/promises` directly to perform `unlink` and `rename`, bypassing the intended `fileIO.ts` adapter layer.
- **Untestable Core Logic:** Because mutations are tangled with Express, they can only be tested via HTTP integration tests (`supertest`).
- **Global State:** The `writeMutex` is a global singleton that callers must remember to acquire.

## Decision

Move all folio mutation orchestration out of the route handler and into `ProjectStore`. 

1. **New Store Methods:** Expose `saveFolio`, `createFolio`, and `deleteFolio` on `ProjectStore`. These methods will absorb the mutex locking, validation, mtime checks, disk writes, link rewrites, and index updates.
2. **Typed Errors:** The store will throw domain-specific error classes (`ValidationError`, `NotFoundError`, `ConflictError`, `InvalidTitleError`). 
3. **Thin HTTP Layer:** The route handler will catch these typed errors and map them to appropriate HTTP status codes (400, 404, 409), stripping it of filesystem and mutex knowledge.
4. **Internalize State:** The global `writeMutex` will become a private instance field on `ProjectStore`.

## Consequences

- **Improved Locality:** All file and index mutation logic will live in one place. Failures during rename or link rewrites are isolated to the store.
- **Higher Leverage:** Future CLI tools or background agents can safely mutate the project by calling `store.saveFolio()` without reimplementing conflict detection or locking.
- **Testability:** Mutations can be verified directly against the store using a synthetic `tmpdir` project, without an Express app.
- **Enables ADR-0003:** This refactoring is a direct structural prerequisite for ADR-0003 (In-Memory Document Model). `ProjectStore` must own the mutation transaction boundary before it can safely implement dirty-tracking and batch flushing.
