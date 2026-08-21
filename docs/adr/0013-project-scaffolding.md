# 13. Project Scaffolding / Schema Setup Wizard

**Date:** 2026-08-21
**Status:** Proposed — skeleton only, design not yet brainstormed

## Context

There is no way to create a new Axiom Forge project from within the tool. `scripts/`
contains only `dev.mjs`, `start.mjs`, and `check-repo.mjs` — no init or scaffold script.
`ProjectStore.load()` reads `config.json` and `schema.json` directly off disk with no
fallback, so pointing `--project` at an empty folder throws on boot.

The only working path today is copying the bundled `fall-of-troy` sample and editing it
in place, or hand-writing `config.json` and `schema.json` from scratch using the README
fragment and the `fall-of-troy` excerpt in [ADR-0004](0004-bidirectional-inverse-fields.md)
as reference. Both assume comfort authoring a JSON schema (field types, section roles,
per-type folder mapping) before touching the actual product.

This is a pre-adoption gap, distinct from every other roadmap item: it determines
whether a new user gets past day one at all, not what they can do once they're in.

## Decision

Not yet designed. To be brainstormed. Candidate shape sketched only:

- A guided flow — pick a starting template (e.g. "worldbuilding," "genealogy," "TV
  writers' room"), then customize field names/types from there — rather than opening a
  text editor and hand-writing raw JSON.
- Where this lives (CLI wizard vs. in-app "New Project" flow vs. both) is undecided.

## Open Questions

- Does this live in the server CLI, the client UI, or both?
- Ship a fixed set of starter templates, or a blank/minimal schema plus a field-type
  picker?
- How does this relate to [ADR-0002](0002-multi-project-management.md)'s "Add Project"
  UI, which currently only locates an *existing* compatible folder?
- Does schema authoring stay JSON, or does the wizard need its own intermediate
  representation?

## Consequences

Not yet assessed — deferred until the design is brainstormed.
