# Testing

Run the full suite from the repo root: `npm test` (Vitest, no watch mode).

## Where tests live

Test files are co-located with the source they cover: `foo.ts` → `foo.test.ts`, same directory.
There is no separate `__tests__/` folder.

## Three tiers

- **`packages/shared`** — unit tests. No mocking. Parser and wikilink tests are purely
  in-memory: input is a constructed `ProjectSchema` or raw Markdown string; assertions cover
  parse output, round-trip fidelity (`parseMarkdown` → `serializeToMarkdown` → re-parse must
  be stable), and rewrite correctness.

- **`packages/server`** — integration tests. Each test builds a fresh project directory under
  `os.tmpdir()`, writes real `.md` and `.json` files, spins up a `ProjectStore`, mounts Express
  routes, and drives them with `supertest`. No file-system mocking — the real I/O is the point.

- **`packages/client`** — unit tests for pure utility functions only (e.g. link resolution
  helpers). React components are not tested today.

## Synthetic schemas rule

Tests must prefer synthetic type names (`Alpha`, `Beta`, etc.) and must not couple behavior
assertions to files in `fall-of-troy/`. The engine is schema-agnostic; tests prove it on
schemas that exist nowhere else, so tests cannot become coupled to sample-data choices.

**Exception:** reading `fall-of-troy/` is acceptable *only* to verify that specific project
files parse correctly (smoke tests). Assert only `result.success` — never specific type names
or field values from the sample project. See `schema.test.ts` for the established pattern.

## What to test when writing new code

- New logic in `packages/shared` → unit test, covering the happy path plus known edge cases.
- New or changed API routes → integration test in `packages/server`, using a synthetic project
  fixture in `tmpdir`.
- New pure utility functions in `packages/client` → unit test.
- React components → not tested today. Adding them requires a test renderer setup
  (e.g. jsdom + `@testing-library/react`). This is a deliberate omission, not an oversight;
  add the setup when the benefit justifies its cost.
