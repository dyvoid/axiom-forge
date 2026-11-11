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
2. **[ADR-0013] Schema setup** — narrowed: getting into a project is built (ADR-0023), so what
   is left is the schema a new project starts with and editing a schema without writing JSON.
   Skeleton ADR: next step is a design brainstorm, not a build.

**[ADR-0020]** stays deferred until after ADR-0013.

## Open Decisions

1. **Whether to schedule two known gaps**, neither on the ROADMAP yet. The preface (text before
   the first `##`) is preserved on save but shown in neither view. And an image embed inside prose
   renders as a broken wiki-link chip and is listed as an unresolved link — rendering it needs an
   endpoint that serves any vault image, not just a folio's cover.

2. **Multi-project decisions made without you, in [ADR-0023](docs/adr/0023-project-registry-and-active-project.md).**
   ADR-0013 was meant to lead on the entry surface and had not been designed, so three calls were
   made to ship: one active project behind the existing endpoints (not a project id in every
   path), the list kept in `~/.axiom-forge/projects.json`, and a fixed one-type starter schema.
   Each is cheap to revisit now and less so later; say if any should go the other way.
3. **`npm run typecheck` does not cover `packages/server`** (only its build does, and CI builds).
   Adding it is a `package.json` change, so it was left for you.

Two standing gaps worth not rediscovering as bugs. A schema-drifted file is readable in the app
but cannot be saved from it, which follows from holding ADR-0012 at #9 —
[Data Model](docs/data-model.md#a-drifted-file-is-readable-but-not-saveable). And the shared
controls' component tests cannot reach layout or real focus ordering, so check those flows in a
browser when changing them — [UI consistency audit](docs/ui-consistency-audit.md).
