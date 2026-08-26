# AGENTS.md

The primary context source for AI agents working in this repository. Read it before doing
anything else. It carries the basics and links out; the linked docs carry the detail, and
deliberately avoid AI-specific instructions so there's no second source of truth.

> **This file is capped at 120 lines**, enforced by `scripts/check-repo.mjs` under
> `npm run lint`. It is read first and read often, so it stays scannable. When it grows past
> the cap, move the detail into a `docs/` file and link to it — never shrink it by dropping
> substance. The same cap applies to [PICKUP.md](PICKUP.md).

## Project Overview

Axiom Forge is a schema-driven, local-first encyclopedia and worldbuilding tool. Every entry is a
plain Markdown file on disk — no database, no cloud, no lock-in. A `schema.json` describes your
world's types and fields; the app parses, validates, and renders them as a fast navigable web UI.
Wikilinks (`[[Folder/Name]]`) are first-class. The files are the source of truth.

The core feature set is complete. New features are chosen from a backlog; see
[docs/ROADMAP.md](docs/ROADMAP.md) for candidates and [PICKUP.md](PICKUP.md) for what's next.

## Architecture

npm workspaces monorepo: `packages/shared` (Markdown parser, Zod schemas, wikilink helpers),
`packages/server` (Express REST API on `:3000`, in-memory `projectStore`), `packages/client`
(React + Vite SPA on `:5173`, TanStack Query). No database — the server reads the project folder
on startup and builds an in-memory index. Saves write back to disk via the API.

See [Architecture Overview](docs/architecture.md) for the full picture, and the
[ADR log](docs/adr/) for the reasoning behind specific decisions.

## AI Instructions

### You can do these freely
- Write, edit, and refactor code that follows the patterns already in the codebase
- Create new files consistent with existing conventions
- Update documentation to match code changes
- Add tests for new or existing functionality

### These need human review before they land
- `schema.json` in any project folder — field changes can silently break existing Markdown files
- `.gitignore` and `.gitattributes`
- Dependency changes (lockfiles, `package.json` manifests)
- Refactors that cut across multiple packages
- CI/CD configuration (`.github/workflows/`)

### Do not do these
- Commit directly to `main`
- Merge to `main` without explicit instruction — the decision to merge is the user's call.
  Finishing work on a branch does not imply merging it.
- Delete or rename files without being asked
- Change architecture without recording an ADR in `docs/adr/`
- Rename or move public API endpoints without explicit instruction — these are a public contract
- Add third-party dependencies without explicit instruction — prefer the existing dep tree
- Introduce a new global state library (Redux, Zustand, Jotai, MobX, etc.) — if you feel the
  need for one, flag the tradeoff, don't add it

## Invariants

Each rule has a *why* so edge cases can be reasoned through, not just pattern-matched.

- **All Markdown parsing and schema validation lives in `packages/shared/src/parser.ts` and
  `packages/shared/src/schema.ts`.** Client and server must never diverge on format. If the
  format changes, change the shared parser — nowhere else.

- **Only standard Markdown + wikilinks (`[[Folder/Name]]`) may be written to disk.** Obsidian
  compatibility is a product guarantee. Anything Obsidian can't read is wrong, no matter how
  convenient.

- **Styling must go through the CSS variable token system (`tokens.css`) and CSS Modules.** The
  print aesthetic depends on coherent tokens; utility frameworks, CSS-in-JS, or inline styles
  that hardcode colors, spacing, or typography fracture the system. Inline styles for dynamic
  values (computed positions, transforms, dimensions) are fine.

- **State has assigned homes; don't fragment it.** Server data → TanStack Query. Project-wide
  config/schema → `ProjectContext`. Local UI state → `useState`/`useReducer`.

- **Prefer the simpler solution; flag architectural expansion explicitly.** This is a solo-user
  local tool. Default to extending what exists over introducing a new subsystem.

## Conventions

- **Package manager:** npm. Node ≥ 18.17. Do not switch.
- **TypeScript** throughout all three packages. Do not loosen `tsconfig` strictness.
- **Module system:** ESM. Do not mix CommonJS into the packages.
- Commit the lockfile (`package-lock.json`). Do not commit `dist/` or build output.
- Linting: ESLint (`.eslintrc.cjs`). Formatting: follow existing style — no Prettier introduced.
- `npm run lint` also runs `scripts/check-repo.mjs`: undefined design tokens, dead relative links
  in Markdown, unresolved `fall-of-troy` wikilinks outside its allowlist, ADRs missing from the
  ROADMAP, and the doc line caps. These live in `lint` rather than a separate CI job so a failure
  reproduces locally.
- **Branching:** short-lived `task/`, `fix/`, `experiment/`. See [Git Strategy](docs/git-strategy.md).
- **Commits:** one per task or prompt session, [Conventional Commits](https://www.conventionalcommits.org).
  Put AI context in the body, not the subject (`ai-assisted: <model>`).

**Testing:** `npm test` from the repo root. Tests are co-located with their source, and must use
synthetic schemas rather than coupling to `fall-of-troy`. See [Testing](docs/testing.md) for the
tier-by-tier rules and what to test when writing new code.

**Documentation:** docs describe what the code *does*, never what it *should* do, and never
restate what git, the PR, or CI already owns. Before closing any task, work the end-of-task
checklist in [Documentation Discipline](docs/documentation.md) — which also defines PICKUP.md's
scope and the ADR hygiene rules.

## Document Index

| Document | What it covers |
|---|---|
| [Roadmap](docs/ROADMAP.md) | Candidate features and their status |
| [Architecture](docs/architecture.md) | System structure, API endpoints, data flow |
| [Data Model](docs/data-model.md) | On-disk Markdown format, field types, serialization rules |
| [Design System](docs/design-system.md) | Typography, color tokens, layout conventions |
| [Testing](docs/testing.md) | Test tiers, synthetic-schema rule, what to test |
| [Documentation](docs/documentation.md) | Doc discipline, PICKUP scope, end-of-task checklist |
| [ADR Log](docs/adr/) | Architecture decisions and their rationale |
| [Git Strategy](docs/git-strategy.md) | Branching, merging, commit rules |
| [PICKUP](PICKUP.md) | Slim handoff: what's in progress, what's next, open decisions |
