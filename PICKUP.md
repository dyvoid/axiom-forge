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

1. **[ADR-0004] Bidirectional / Inverse Fields** — Accepted, and now unblocked: ADR-0019 shipped,
   so `createSchemaIndex().typeKeyForFolder()` is available for the schema-load validation that
   must resolve a `target` folder to a type before it can check an `inverse` path.
   **This is the next build.** Its two Open Items (deletion, dangling targets) are decidable at
   build time, not user-blocked.
2. **[ADR-0013] Project Scaffolding** — the only backlog item that changes who can adopt the
   tool, and as of 2026-08-30 it also owns the onboarding surface for ADR-0002 and ADR-0005.
   Skeleton ADR: next step is a design brainstorm, not a build.

**[ADR-0020]** is deferred until after ADR-0013 — it reorganizes the same `load`/`reload` surface
scaffolding will reshape.

## Open Decisions

None. The four raised by the 2026-08-30 ADR audit were answered that day and are recorded where
they belong: ADR-0019 accepted and ADR-0020 deferred (their status lines), ADR-0013 given the
onboarding surface (its Scope section), and ADR-0012 / ADR-0001 / ADR-0014 reviewed and held at
their current rank and scope (their [ROADMAP](docs/ROADMAP.md) rows).

One accepted gap follows from holding ADR-0012 at #9: a schema-drifted file is readable in the
app but cannot be saved from it. Documented in
[Data Model](docs/data-model.md#a-drifted-file-is-readable-but-not-saveable) so it is not
rediscovered as a bug.
