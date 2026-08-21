# PICKUP

Where the last session left off. A slim handoff for the next session — not a session
diary. For the feature backlog, see [docs/ROADMAP.md](docs/ROADMAP.md). For what a
session did, read git log.

## In Progress

Nothing. Design review (two rounds, 13 fixes) is done and merged.

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

Remaining from the impeccable design review, deferred deliberately:

- **Responsive breakpoints.** Zero `@media` queries in the client. The 88px folio
  title, fixed 240px sidebar, and fixed 280px meta column break under ~1100px. Needs
  a breakpoint strategy, not a one-off fix.
- **Italic overuse.** Placeholders, buttons, tags, aliases, snippets, and the
  landing title are all italic. Needs a deliberate pass deciding what italic means
  in this design and routing the rest to upright.
- **WebGL smoke on the landing.** Reads as flat parchment in the screenshot. Either
  dial it up until it registers or cut it.
