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
- React components → render test with `@testing-library/react`. Start the file with a
  `/** @vitest-environment jsdom */` docblock: only component files pay for a DOM, and the
  pure-utility tests keep running in node. Components that read the folio index or the schema
  render through `src/test/renderWithProject.tsx`, which seeds the query cache and a fixture
  schema rather than mocking the fetch layer, so the component runs its real code paths.

  Assert through roles and accessible names (`getByRole('combobox', { name: 'Allies' })`), not
  CSS-module class names — the class names are hashed, and an assertion on one pins the
  implementation rather than the behaviour.

### Node version

CI pins Node 20 (`.github/workflows/ci.yml`), and `engines` declares `>=20.19.0`. A test
dependency must fit inside that range — it does not get to raise the project's supported Node.
jsdom 30 requires Node 22.22+ and turned `main` red while passing locally on a Node 22 machine,
because `npm ci` does not enforce `engines`. jsdom is pinned to ^28 for that reason.

It lives in the **root** devDependencies, not the client's: vitest declares jsdom as an optional
peer and resolves it from its own location, so a client-local copy is the one version that
doesn't get used. Check `npm why jsdom` returns a single entry after touching it.

If a test run passes locally and fails in CI, compare `node -v` against the workflow first.

### What component tests cannot reach

jsdom implements no layout. Two classes of bug pass a green suite and need a real browser:

- **Anything about layout or CSS.** Including the composed-class ordering trap recorded in
  [the UI consistency audit](ui-consistency-audit.md), where a shared class silently flattened
  a textarea's 240px min-height to 38px.
- **Event ordering that depends on real focus.** The pickers commit on `mousedown` +
  `preventDefault` rather than `click`; jsdom fires both with no focus ordering behind them,
  so swapping the handler keeps the tests green. Verified by mutation, and noted in the tests.

A test that passes against the bug it claims to cover is worse than no test. When a test exists
to pin a specific regression, break the code and watch it fail before trusting it.

## What the checks do not cover

`npm test` runs Vitest, which transpiles without typechecking, and `npm run lint` runs ESLint,
markdownlint, and `check-repo.mjs`. Neither typechecks anything, and `vite build` does not either.

Typechecking is its own command: **`npm run typecheck`** (`tsc -p packages/client --noEmit`), which
CI runs between Lint and Build. `packages/shared` and `packages/server` need no entry there — their
own `tsc` builds typecheck them, and `npm run build` runs both.

All three packages are currently clean. Before this became a gate the client carried standing
errors that nothing caught, so the count drifted and the figure recorded here went stale twice.
Keep it at zero rather than re-introducing a tolerated baseline.
