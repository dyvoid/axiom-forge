# 6. Encapsulate Folio Mutations

**Date:** 2026-06-05
**Status:** Accepted (implemented 2026-06-19)

## Context

The server architecture separates data access (`ProjectStore`) from HTTP delivery (`routes/folios.ts`). `ProjectStore` was deep for reads (handling parsing and index building) but shallow for writes.

Methods like `addFolioRecord` and `updateFolioRecord` on the store were bare array mutations. All the real domain logic for writing — acquiring the global `writeMutex`, detecting mtime conflicts, converting titles to filenames, performing atomic writes, orchestrating project-wide wikilink rewrites, and deriving snippets — lived in the HTTP route handler.

This led to several architectural issues:
- **Leaked Domain Logic:** The HTTP layer acted as the domain orchestrator, making it ~340 lines long and highly complex.
- **Bypassed Seams:** The route handler imported `node:fs/promises` directly to perform `unlink` and `rename`, bypassing the intended `fileIO.ts` adapter layer.
- **Untestable Core Logic:** Because mutations were tangled with Express, they could only be tested via HTTP integration tests (`supertest`).
- **Global State:** The `writeMutex` was a global singleton that callers had to remember to acquire.

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

## Implementation (2026-06-19)

- `ProjectStore.saveFolio` / `createFolio` / `deleteFolio` now own all mutation orchestration; `routes/folios.ts` validates only the request envelope and maps domain errors to status codes via a `sendDomainError` helper.
- Domain errors live in `storeErrors.ts`. Beyond the four originally named, the implementation added `BadRequestError` (unknown folder), `RenameFailedError`, and `LinkRewriteFailedError` to preserve the existing operational 500 response bodies exactly.
- `deleteFolioFile` was added to `fileIO.ts` so DELETE's `unlink` also goes through the seam — no route imports `node:fs/promises` for mutations anymore.
- The global `writeMutex` singleton was removed; the mutex is now a private instance field on `ProjectStore`.
- 11 direct store mutation tests (`projectStoreMutations.test.ts`) were added, realizing the testability goal; all existing HTTP integration tests pass unchanged, confirming the API surface is preserved.
