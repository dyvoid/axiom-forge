# Axiom Forge — System Manual

Welcome to the Axiom Forge system documentation. This directory (`docs/`) contains the architectural truth of the application in its current, functional state.

**Axiom Forge** is a local web application for writers and world-builders. It reads a folder of structured Markdown files as its database, renders them as a browsable encyclopedia, and allows in-app editing. The Markdown files are simultaneously valid Obsidian documents, so the same files can be opened and edited in Obsidian without any conversion.

## Documentation Map

If you want to understand how the system is built, read these files in order:

| File | Description |
|---|---|
| [`architecture.md`](architecture.md) | How the npm workspaces monorepo is structured, how the Vite frontend and Express backend communicate, API routes, and React Router logic. |
| [`Data_Model.md`](Data_Model.md) | The strict rules governing `.md` file parsing, `schema.json` layouts, and save validation logic. |
| [`Design_System.md`](Design_System.md) | The print-aesthetic CSS Modules design tokens, typography, colors, and layout modifiers (like omitting empty sections). |

*Note: If you are looking for future milestones, planned features, or architecture decisions, look in the `adr/` directory at the root of the project.*
