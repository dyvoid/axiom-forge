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

## Scope: this ADR owns the onboarding surface

Decided 2026-08-30. Four ADRs each specified or depended on the same "how does a user get into
a project" surface, by whichever mechanism each happened to assume:
[ADR-0002](0002-multi-project-management.md) an "Add Project" UI that locates an existing folder,
[ADR-0005](0005-desktop-packaging-distribution.md) an Electron `showOpenDialog` folder picker,
this ADR a "New Project" flow, and [ADR-0014](0014-visibility-access-control.md) a question about
how its views relate to ADR-0002.

This ADR leads. Whatever shape the scaffolding design settles on — where the flow lives, how a
project is chosen or created, what the no-project empty state looks like — is the shape the
others adopt rather than re-specify. ADR-0002 and ADR-0005 keep their own subjects (switching
between loaded projects; the Electron shell and packaging) and defer the entry surface to here.

It leads because it is the only one of the four that is a pre-adoption blocker, and because
creating a project is the strictly harder case: a design that can create one can also open one,
where the reverse is not true.

## Open Questions

- Does this live in the server CLI, the client UI, or both? Now also has to answer for the
  others: a CLI-only wizard would leave ADR-0002 and ADR-0005 without an entry surface, so
  "both" is the likely floor rather than one option among three.
- Ship a fixed set of starter templates, or a blank/minimal schema plus a field-type
  picker?
- Does schema authoring stay JSON, or does the wizard need its own intermediate
  representation?
- What does the no-project empty state do — inherited from ADR-0002, which specified it but no
  longer owns it.

## Consequences

Not yet assessed — deferred until the design is brainstormed.
