# 2. Multi-Project Management

**Date:** 2026-05-23  
**Status:** Proposed

## Context
Currently, the application runs via a `--project` CLI flag pointing to a single folder. There is no way from within the UI to switch between different Axiom Forge projects or initialize a new one from an empty state.

> **Scope narrowed 2026-08-30.** The onboarding/entry surface below is now owned by
> [ADR-0013](0013-project-scaffolding.md), which leads on how a user gets into a project at all.
> What remains this ADR's subject is everything *after* that: switching between loaded projects,
> editing a project's config, and removing one. The Onboarding bullet is kept as the original
> statement of the empty state, but ADR-0013 settles its shape.

## Decision
We will build multi-project management directly into the application.
- **Onboarding:** If the app loads without a project, it will display an "Add Project" UI to locate a compatible folder. *(Superseded in scope by [ADR-0013](0013-project-scaffolding.md).)*
- **Top Bar Switcher:** The top bar title will become a dropdown menu, allowing users to switch between loaded projects or add new ones.
- **Config Editor:** Users will be able to edit a project's `config.json` directly from the UI.
- **Project Deletion:** Users can remove a project via the UI. This must include a critical warning asking whether to just *unlink* the project from Axiom Forge, or *permanently delete* all markdown files from the disk.

## Consequences
- The Express backend must support loading, storing, and switching multiple project contexts, likely abandoning the strict single `--project` flag limitation.
- The UI requires significant new components for the empty state and the project dropdown switcher.
- Safe deletion logic is required to prevent accidental data loss of markdown files.
