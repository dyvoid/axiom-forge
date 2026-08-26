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

1. **[ADR-0009] Consolidate Folio Validation Rules** — Accepted and self-contained,
   but modest payoff. Changes user-visible warning wording, so the four parser tests
   asserting those strings need updating.
2. **[ADR-0004] Bidirectional / Inverse Fields** — Accepted. The one open product
   call (push-prompt scope) was decided 2026-08-21: the save-time prompt covers both
   additions and removals, same non-destructive pattern either way. No longer
   user-blocked; the two remaining open items (deletion, dangling targets) are
   decidable without the user.
3. **[ADR-0013] Project Scaffolding** — skeleton ADR only. The next step is a design
   brainstorm, not a build.

Three architecture candidates were recorded on 2026-08-26 from a codebase review and sit in
[ROADMAP](docs/ROADMAP.md#architecture-candidates) as `Proposed` — they are designs on paper, not
agreed work, so they need a yes before anyone builds them. Order matters if they are taken up:
ADR-0019 first (ADR-0020 wants its lookups), ADR-0021 independent. ADR-0021 is the only one with
a failure mode behind it rather than tidiness — the field-emptiness predicate has three copies
split across the serializer and the read view, so they can drift on what counts as empty. All
three are refactors with no user-visible change.

## Open Decisions

- **Accept or drop ADR-0019 / ADR-0020 / ADR-0021.** Recorded as `Proposed`; none is urgent, and
  each competes with the feature backlog rather than blocking it.
