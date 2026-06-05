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

Active development. Phases 1–4 complete (read/edit views, live search, tag filtering, backlinks,
broken-link detection, project-wide link rewriting on rename). Currently in Phase 5 (Themes) and
Phase 6 (multi-project management).

---

## Architecture

npm workspaces monorepo: `packages/shared` (Markdown parser, Zod schemas, wikilink helpers),
`packages/server` (Express REST API on `:3000`, in-memory `projectStore`), `packages/client`
(React + Vite SPA on `:5173`, TanStack Query). No database — the server reads the project folder
on startup and builds an in-memory index. Saves write back to disk via the API.

See [Architecture Overview](docs/architecture.md) for the full picture, and the [ADR log](adr/)
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
- Delete or rename files without being asked
- Change architecture without recording an ADR in `adr/`
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
- Module system: ESM. Do not mix CommonJS into the packages.

### Branching
Short-lived branches only: `task/`, `fix/`, `experiment/`. See [Git Strategy](docs/git-strategy.md).

### Commits
One commit per task or prompt session. [Conventional Commits](https://www.conventionalcommits.org).
Put AI context in the body, not the subject:

```
feat(scope): short imperative summary

ai-assisted: claude-sonnet-4-6 | prompt: .prompts/<name>.md
```

### Prompts
Prompts that produced meaningful code live in `.prompts/`. Reference them from the commit body.

---

## Documentation Discipline

- **Docs describe what the code *does*, never what it *should* do.** If a behavior isn't
  implemented yet, it doesn't go in `docs/`. It goes in an ADR as a proposed decision.

## End-of-Task Checklist

Before closing any feature or architecture task, answer each question explicitly:

- Did any API endpoint change, or was a server behavior added/removed? → Update `docs/architecture.md`
- Did the on-disk Markdown format, field types, or validation rules change? → Update `docs/Data_Model.md`
- Did any UI convention, design token, or layout rule change? → Update `docs/Design_System.md`
- Is this a new feature or a new architectural direction? → Write an ADR in `adr/`
- Did an existing ADR's decision get superseded or changed? → Update its status and link to the new ADR

---

## Document Index

| Document | What it covers |
|---|---|
| [Architecture](docs/architecture.md) | System structure, API endpoints, data flow |
| [Data Model](docs/Data_Model.md) | On-disk Markdown format, field types, serialization rules |
| [Design System](docs/Design_System.md) | Typography, color tokens, layout conventions |
| [ADR Log](adr/) | Architecture decisions and their rationale |
| [Git Strategy](docs/git-strategy.md) | Branching, merging, commit rules |
| [PICKUP](PICKUP.md) | Where the last session left off |
