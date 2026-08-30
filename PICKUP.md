# PICKUP

Where the last session left off. A slim handoff for the next session — not a session
diary. For the feature backlog, see [docs/ROADMAP.md](docs/ROADMAP.md). For what a
session did, read git log.

> **Capped at 120 lines**, enforced by `scripts/check-repo.mjs` under `npm run lint`, and it
> should normally sit far below that — past ~50 lines it has stopped being a handoff. Record
> what's in progress, what's next, and what needs a decision; remove entries as work lands
> rather than accumulating them. See [Documentation Discipline](docs/documentation.md).

## In Progress

Nothing.

## Next Up

Recommended order, with the reasoning so it does not need re-deriving:

1. **[ADR-0019] Schema Index** — `Proposed`, so it needs a yes first, but it is the recommended
   next build rather than deferrable tidiness. ADR-0004 below cannot do its schema-load
   validation without resolving `target` folders to types, which is what this index is; doing it
   after means writing that lookup an eleventh time in the one place a wrong answer silently
   accepts a bad annotation. Small, unit-testable in an existing tier, and retires two of the
   standing `packages/client` type errors.
2. **[ADR-0004] Bidirectional / Inverse Fields** — Accepted. The one open product
   call (push-prompt scope) was decided 2026-08-21: the save-time prompt covers both
   additions and removals, same non-destructive pattern either way. No longer
   user-blocked; the two remaining open items (deletion, dangling targets) are
   decidable without the user.
3. **[ADR-0013] Project Scaffolding** — skeleton ADR only, and the only backlog item
   that changes who can adopt the tool at all: today a new project means hand-writing
   `schema.json`. The next step is a design brainstorm, not a build.

**[ADR-0020]** is the odd one out and should not be bundled with ADR-0019: nothing waits on it,
there is no failure mode behind it, and it reorganizes the same `ProjectStore.load`/`reload`
surface ADR-0013 will reshape. Better after ADR-0013 than before it.

## Open Decisions

- **Accept ADR-0019?** Recommended yes, as a prerequisite for ADR-0004 rather than on its own
  merits. See its Context for the ADR-0004 dependency.
- **Accept or defer ADR-0020?** Recommended defer until after ADR-0013. Reasoning is in the
  ADR's Sequencing section.
