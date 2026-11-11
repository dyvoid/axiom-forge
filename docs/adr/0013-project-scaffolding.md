# 13. Project Scaffolding / Schema Setup Wizard

**Date:** 2026-08-21
**Status:** Proposed — skeleton only, design not yet brainstormed

## Context

A new project can be started from the project list
([ADR-0023](0023-project-registry-and-active-project.md)): adding an empty folder writes a
`config.json` and a fixed starter `schema.json` with a single generic type. That gets a new user
into a working project, and no further.

Making the schema fit the world still means hand-editing `schema.json`, using the README fragment
and `fall-of-troy/schema.json` as reference. That assumes comfort authoring a JSON schema (field
types, section roles, per-type folder mapping) before the product has shown what any of it does.

This is a pre-adoption gap, distinct from every other roadmap item: it determines
whether a new user gets past day one at all, not what they can do once they're in.

## Decision

Not yet designed. To be brainstormed. Candidate shape sketched only:

- A guided flow — pick a starting template (e.g. "worldbuilding," "genealogy," "TV
  writers' room"), then customize field names/types from there — rather than opening a
  text editor and hand-writing raw JSON.
- It extends the "start a project" step on the project list; a CLI counterpart is undecided.

## Scope: the entry surface is settled; schema setup is what remains

This ADR was to lead on "how does a user get into a project", a surface
[ADR-0002](0002-multi-project-management.md), [ADR-0005](0005-desktop-packaging-distribution.md)
and [ADR-0014](0014-visibility-access-control.md) each touched. Multi-project was built first, so
that surface was decided in [ADR-0023](0023-project-registry-and-active-project.md#the-entry-surface):
it lives in the client, on the project list; a project is chosen by folder path; with none open
the app shows the list.

What this ADR still owns is everything after the folder exists: which schema a new project starts
with, and how a schema is shaped without writing JSON. Whatever it designs replaces the fixed
starter schema at the one point where a project is created
(`ProjectRegistry.scaffold`).

## Open Questions

- Ship a fixed set of starter templates, or keep the minimal schema and add a field-type picker?
- Does schema authoring stay JSON, or does the wizard need its own intermediate
  representation?
- Is a CLI scaffold worth having beside the in-app flow?
- Editing the schema of a project that already has folios raises the drift question
  [Data Model](../data-model.md#a-drifted-file-is-readable-but-not-saveable) records.

## Consequences

Not yet assessed — deferred until the design is brainstormed.
