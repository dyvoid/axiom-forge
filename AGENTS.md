# AGENTS.md

This file is the primary context source for AI agents working in this repository. Read it before
doing anything else. The linked docs carry context and decisions; they deliberately avoid
AI-specific instructions so there's no second source of truth.

---

## Project Overview

Axiom Forge is a schema-driven, local-first encyclopedia and worldbuilding tool. Every entry is a
plain Markdown file on disk — no database, no cloud, no lock-in. A `schema.json` describes your
world's types and fields; the app parses, validates, and renders them as a fast navigable web UI.
Wikilinks (`[[Folder/Name]]`) are first-class. The files are the source of truth.

The core feature set is complete: read/edit views, live search, tag filtering, backlinks,
broken-link detection, and project-wide link rewriting on rename. New features are chosen
from a backlog; see [PICKUP.md](PICKUP.md) for the current state and candidate features.

---

## Architecture

npm workspaces monorepo: `packages/shared` (Markdown parser, Zod schemas, wikilink helpers),
`packages/server` (Express REST API on `:3000`, in-memory `projectStore`), `packages/client`
(React + Vite SPA on `:5173`, TanStack Query). No database — the server reads the project folder
on startup and builds an in-memory index. Saves write back to disk via the API.

See [Architecture Overview](docs/architecture.md) for the full picture, and the [ADR log](docs/adr/)
for the reasoning behind specific decisions.

---

## AI Instructions

### You can do these freely
- Write, edit, and refactor code that follows the patterns already in the codebase
- Create new files consistent with existing conventions
- Update documentation to match code changes
- Add tests for new or existing functionality

### These need human review before they land
- `schema.json` in any project folder — field changes can silently break all existing Markdown files
- `.gitignore` and `.gitattributes`
- Dependency changes (lockfiles, `package.json` manifests)
- Refactors that cut across multiple packages
- CI/CD configuration (`.github/workflows/`)

### Do not do these
- Commit directly to `main`
- Merge to `main` without explicit instruction — the decision to merge is the user's
  call, not the agent's. Finishing work on a branch does not imply merging it.
- Delete or rename files without being asked
- Change architecture without recording an ADR in `docs/adr/`
- Rename or move public API endpoints without explicit instruction — these are a public contract
- Add third-party dependencies without explicit instruction — prefer the existing dep tree
- Introduce a new global state library (Redux, Zustand, Jotai, MobX, etc.) — if you feel the
  need for one, flag the tradeoff, don't add it

---

## Invariants

Each rule has a *why* so edge cases can be reasoned through, not just pattern-matched.

- **All Markdown parsing and schema validation lives in `packages/shared/src/parser.ts` and
  `packages/shared/src/schema.ts`.** Client and server must never diverge on format. If the format
  changes, change the shared parser — nowhere else.

- **Only standard Markdown + wikilinks (`[[Folder/Name]]`) may be written to disk.** Obsidian
  compatibility is a product guarantee. Anything Obsidian can't read is wrong, no matter how
  convenient.

- **Styling must go through the CSS variable token system (`tokens.css`) and CSS Modules.** The
  print-aesthetic depends on coherent tokens. Utility frameworks, CSS-in-JS, or inline styles that
  hardcode colors, spacing, or typography fracture the system. Inline styles for dynamic values
  (computed positions, transforms, dimensions) are fine.

- **State has assigned homes; don't fragment it.** Server data → TanStack Query. Project-wide
  config/schema → `ProjectContext`. Local UI state → `useState`/`useReducer`.

- **Prefer the simpler solution; flag architectural expansion explicitly.** This is a solo-user
  local tool. Default to extending what exists over introducing a new subsystem.

---

## Conventions

### Stack
- **Package manager:** npm. Node ≥ 18.17. Do not switch.
- **TypeScript** throughout all three packages. Do not loosen `tsconfig` strictness.
- Commit the lockfile (`package-lock.json`). Do not commit `dist/` or build output.
- Linting: ESLint (`.eslintrc.cjs`). Formatting: follow existing style — no Prettier introduced.
- `npm run lint` also runs `scripts/check-repo.mjs`: undefined design tokens, dead relative links
  in Markdown, unresolved `fall-of-troy` wikilinks outside its allowlist, and ADRs missing from the
  ROADMAP. These live in `lint` rather than a separate CI job so a failure reproduces locally.
- Module system: ESM. Do not mix CommonJS into the packages.

### Branching
Short-lived branches only: `task/`, `fix/`, `experiment/`. See [Git Strategy](docs/git-strategy.md).

### Commits
One commit per task or prompt session. [Conventional Commits](https://www.conventionalcommits.org).
Put AI context in the body, not the subject:

```
feat(scope): short imperative summary

ai-assisted: claude-sonnet-4-6
```

---

## Testing

Run the full suite from the repo root: `npm test` (Vitest, no watch mode).

### Where tests live

Test files are co-located with the source they cover: `foo.ts` → `foo.test.ts`, same directory.
There is no separate `__tests__/` folder.

### Three tiers

- **`packages/shared`** — unit tests. No mocking. Parser and wikilink tests are purely
  in-memory: input is a constructed `ProjectSchema` or raw Markdown string; assertions cover
  parse output, round-trip fidelity (`parseMarkdown` → `serializeToMarkdown` → re-parse must
  be stable), and rewrite correctness. The schema tests additionally smoke-test the real
  `fall-of-troy/` project files — see Synthetic schemas rule below.

- **`packages/server`** — integration tests. Each test builds a fresh project directory under
  `os.tmpdir()`, writes real `.md` and `.json` files, spins up a `ProjectStore`, mounts Express
  routes, and drives them with `supertest`. No file-system mocking — the real I/O is the point.

- **`packages/client`** — unit tests for pure utility functions only (e.g. link resolution
  helpers). There are no component or UI tests; React components are not tested today.

### Synthetic schemas rule

Tests must prefer synthetic type names (`Alpha`, `Beta`, etc.) and must not couple behavior
assertions to files in `fall-of-troy/`. The engine is schema-agnostic; tests prove it on
schemas that exist nowhere else. This prevents tests from becoming coupled to sample-data
choices.

**Exception:** Reading `fall-of-troy/` is acceptable *only* to verify that specific project
files parse correctly (smoke tests). Assert only `result.success` — never specific type names
or field values from the sample project. See `schema.test.ts` for the established pattern.

### What to test when writing new code

- New logic in `packages/shared` → unit test, covering the happy path plus known edge cases.
- New or changed API routes → integration test in `packages/server`, using a synthetic project
  fixture in `tmpdir`.
- New pure utility functions in `packages/client` → unit test.
- React components → not tested today. Adding them requires a test renderer setup
  (e.g. jsdom + `@testing-library/react`), which is a deliberate omission, not an
  oversight. Add when the benefit justifies the setup cost.

---

## Documentation Discipline

- **Docs describe what the code *does*, never what it *should* do.** If a behavior isn't
  implemented yet, it doesn't go in `docs/`. It goes in an ADR as a proposed decision.

- **Never write a fact into a tracked file when another system already owns it.** Git owns branch
  and merge state; the pull request owns its own review status; CI owns whether the build passed.
  Duplicating any of those into `PICKUP.md`, an ADR, or a README produces a statement that is true
  for a few hours and then silently false — and it is *most* misleading exactly when someone trusts
  it. "This branch is unmerged", "awaiting review", "N commits ahead", "PR #12 is open" belong in
  the pull request description or the commit message, both of which are scoped to the change and
  stop being read once it lands.

  The test to apply before writing a sentence into a tracked file: **would an ordinary action —
  merging, pushing, cutting a release — make this false without anyone editing the file?** If yes,
  it goes in the PR or commit message instead.

  This does not forbid `PICKUP.md` from recording where work stood; that is its job. It forbids
  restating what git and the forge already answer authoritatively. Prefer the durable half: "ADR-0010
  is next, because `rewriteProjectLinks` writes every linking file with no mtime check" stays true
  regardless of what has merged.

### PICKUP.md scope

PICKUP.md is a slim handoff file, not a session diary. It exists so the next session starts
with context and next steps in under a minute. Three things go in it:

- **In Progress** — what's half-done, if anything (branch name, what remains)
- **Next Up** — the recommended next work, with enough reasoning that it doesn't need
  re-deriving
- **Open Decisions** — anything that needs the user's input before work can proceed

What does **not** go in PICKUP.md:

- **Completed work that's merged.** Git log is the record. If it's done and on `main`,
  it's history — PICKUP.md is for the future, not the past.
- **Implementation details.** Commit messages and ADRs own the "why" and "how". PICKUP
  owns "what's next".
- **Session transcripts.** Do not write a narrative of what the session did. The next
  session needs to know where to start, not what the last one did.

If PICKUP.md is longer than ~50 lines, you're writing too much. When you update it, remove
entries for work that's been completed and merged — do not accumulate.

## End-of-Task Checklist

Before closing any feature or architecture task, answer each question explicitly:

- Did any API endpoint change, or was a server behavior added/removed? → Update `docs/architecture.md`
- Did the on-disk Markdown format, field types, or validation rules change? → Update `docs/data-model.md`
- Did any UI convention, design token, or layout rule change? → Update `docs/design-system.md`
- Is this a new feature or a new architectural direction? → Write an ADR in `docs/adr/`
- Did an existing ADR's decision get superseded or changed? → Update its status and link to the new ADR

Then, at the end of **every** session (not just feature/architecture work), always:

- **Update [PICKUP.md](PICKUP.md)** so the next session starts with context, not archaeology.
  Follow the [PICKUP.md scope](#pickupmd-scope) rules: what's in progress, what's next, open
  decisions. Remove completed work — do not accumulate.
- **Update [docs/ROADMAP.md](docs/ROADMAP.md)** if any backlog or housekeeping item was started,
  finished, or re-scoped.
- **Re-check the [ADR log](docs/adr/) for correctness** against the work just done — not just the
  status field, the *content*. For every ADR the session touched, overlapped with, or partially
  advanced, ask whether its Context, Decision, or Consequences are still accurate. This is the
  important part: an ADR that quietly drifts out of sync with reality is worse than none.
  Then act by the ADR's status:
  - **`Proposed` ADR** → it's still a draft, so **edit the body in place** to match current
    reality (e.g. correct a Context sentence that a partial fix made stale), and promote it to
    `Accepted` only once its decision is actually fully implemented.
  - **`Accepted` ADR** → treat the body as an immutable historical record. **Do not rewrite it.**
    If the work changed or invalidated its decision, set its status to `Superseded` (or `Rejected`
    if the decision was abandoned), and write a **new ADR** capturing the new direction, linking
    the two.

---

## Document Index

| Document | What it covers |
|---|---|
| [Roadmap](docs/ROADMAP.md) | Candidate features and their status |
| [Architecture](docs/architecture.md) | System structure, API endpoints, data flow |
| [Data Model](docs/data-model.md) | On-disk Markdown format, field types, serialization rules |
| [Design System](docs/design-system.md) | Typography, color tokens, layout conventions |
| [ADR Log](docs/adr/) | Architecture decisions and their rationale |
| [Git Strategy](docs/git-strategy.md) | Branching, merging, commit rules |
| [PICKUP](PICKUP.md) | Slim handoff: what's in progress, what's next, open decisions |
