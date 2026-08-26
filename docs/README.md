# Axiom Forge — System Manual

This directory describes the application as it is, not as it is planned to be. **Axiom Forge** is
a local web application for writers and world-builders: it reads a folder of structured Markdown
files as its database, renders them as a browsable encyclopedia, and allows in-app editing. The
files are simultaneously valid Obsidian documents, openable and editable there without conversion.

## Documentation Map

To understand how the system is built, read these in order:

| File | Description |
|---|---|
| [`architecture.md`](architecture.md) | How the npm workspaces monorepo is structured, how the Vite frontend and Express backend communicate, API routes, and React Router logic. |
| [`data-model.md`](data-model.md) | The strict rules governing `.md` file parsing, `schema.json` layouts, and save validation logic. |
| [`design-system.md`](design-system.md) | The print-aesthetic CSS Modules design tokens, typography, colors, and layout modifiers (like omitting empty sections). |

Two more cover how the repository itself is worked in:

| File | Description |
|---|---|
| [`testing.md`](testing.md) | Test tiers, the synthetic-schema rule, and what to test when adding code. |
| [`documentation.md`](documentation.md) | Doc discipline, size limits, PICKUP scope, ADR hygiene, and the end-of-task checklist. |

For candidate features and architecture decisions, see [`ROADMAP.md`](ROADMAP.md) and
[`adr/`](adr/). For branching and commit rules, see [`git-strategy.md`](git-strategy.md).
