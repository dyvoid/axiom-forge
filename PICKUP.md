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
   next build rather than deferrable tidiness: ADR-0004 cannot validate an `inverse` path without
   resolving `target` folders to types, which is what this index is. Small, unit-testable in an
   existing tier, and retires two standing `packages/client` type errors.
2. **[ADR-0004] Bidirectional / Inverse Fields** — Accepted; its two Open Items (deletion,
   dangling targets) are decidable at build time, not user-blocked.
3. **[ADR-0013] Project Scaffolding** — the only backlog item that changes who can adopt the tool
   at all. Skeleton ADR: next step is a design brainstorm, not a build.

**[ADR-0020]** should not be bundled with ADR-0019 — nothing waits on it, and it reorganizes the
same `load`/`reload` surface ADR-0013 will reshape. Better after ADR-0013.

## Open Decisions

An audit of every unfinished ADR (2026-08-30) checked each one's claims against the code. The
staleness it found is already fixed in the ADRs; these product calls remain:

- **Accept ADR-0019?** Recommended yes — see its Context for the ADR-0004 dependency.
- **Accept or defer ADR-0020?** Recommended defer — see its Sequencing section.
- **Who owns onboarding?** ADR-0002, ADR-0005, ADR-0013 and ADR-0014 each specify or depend on
  the same "get into a project" surface. See the note above the
  [Candidate Features](docs/ROADMAP.md#candidate-features) table.
- **Drop ADR-0001 and/or ADR-0014?** Both persona-dependent with no consensus; each has a
  structural objection in its ROADMAP row. Dropping means status `Rejected` with a reason.

Separately, **ADR-0012 looks mis-ranked at #10**: schema drift is readable but unsaveable in the
app today, and source mode is the only in-app repair.
