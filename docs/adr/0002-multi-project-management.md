# 2. Multi-Project Management

**Date:** 2026-05-23
**Status:** Accepted

## Context

The application ran via a `--project` CLI flag pointing to a single folder. There was no way from
within the UI to switch between Axiom Forge projects, or to start from an empty state.

## Decision

Multi-project management is built into the application.

- **Onboarding.** With no project open, the app shows the project list, where a folder can be
  added. The shape of that surface is recorded in
  [ADR-0023](0023-project-registry-and-active-project.md#the-entry-surface).
- **Top bar switcher.** The project name in the top bar is a menu: back to the project's home
  page, across to another project, or to the full list.
- **Config editor.** A project's `config.json` (name, description, version) is edited from the
  project list. Keys the app does not manage are kept.
- **Project removal.** A project can be removed from the UI. The user chooses between *unlinking*
  it from Axiom Forge and *permanently deleting* its folder; deleting is the second, guarded
  choice, and requires typing the project's name.

How the server holds several projects, and what the API addresses, is decided in
[ADR-0023](0023-project-registry-and-active-project.md).

## Consequences

- The backend loads, stores and switches project contexts. The `--project` flag remains, as a way
  to open a project rather than the only way to choose one.
- The UI gained a project list page and a project menu in the header.
- Deleting from disk removes the whole folder, not only Markdown: images, `.obsidian/`, anything
  else kept there. The confirmation says so.

## Implementation

Server: `ProjectRegistry` and `routes/projects.ts`. Client: `routes/Projects.tsx`,
`routes/ProjectOpen.tsx`, `components/projects/`, `components/layout/ProjectMenu.tsx`.

One deviation from the original decision: it said the config editor would edit `config.json`
"directly". It edits the three fields the schema defines through a form, not the raw JSON.
