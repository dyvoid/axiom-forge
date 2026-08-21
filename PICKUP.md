# PICKUP

Where the last session left off. A slim handoff for the next session — not a session
diary. For the feature backlog, see [docs/ROADMAP.md](docs/ROADMAP.md). For what a
session did, read git log.

## In Progress

Nothing. The Grand Index `bolder` pass is done and on `main`.

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
3. **[ADR-0004] Bidirectional / Inverse Fields** — Accepted but blocked on one
   product call: should the save-time prompt also offer to *clear* an inverse when a
   link is removed, or handle additions only? (The other two open items are
   decidable without the user.)

## Design Backlog

Empty. The WebGL smoke, italic overuse, `window.confirm` guard, and critique
findings (breadcrumbs, edit toolbar, token cleanup) are all done.
