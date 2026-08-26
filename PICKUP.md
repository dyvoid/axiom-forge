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

1. **[ADR-0010] Multi-File Write Safety** — the only open item that closes a *live
   data-loss path*. `rewriteProjectLinks` writes every linking file with no mtime
   check, so an external edit to any linking file is silently overwritten on rename.
   Server-only, Accepted, no pending design decisions, fits the existing
   integration-test pattern.
2. **[ADR-0009] Consolidate Folio Validation Rules** — Accepted and self-contained,
   but modest payoff. Changes user-visible warning wording, so the four parser tests
   asserting those strings need updating.
3. **[ADR-0004] Bidirectional / Inverse Fields** — Accepted. The one open product
   call (push-prompt scope) was decided 2026-08-21: the save-time prompt covers both
   additions and removals, same non-destructive pattern either way. No longer
   user-blocked; the two remaining open items (deletion, dangling targets) are
   decidable without the user.

## Open Decisions

None.
