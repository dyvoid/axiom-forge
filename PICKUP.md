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

1. **Runtime dependency upgrades.** `npm audit --omit=dev` flags `js-yaml` and `linkify-it` (via
   `markdown-it`) as high, plus `express`'s `body-parser`/`qs` and `react-router`'s
   `@remix-run/router` as moderate. Upgrading is a dependency change, which AGENTS.md routes
   through the user. `js-yaml` matters most: it parses every folio's frontmatter.
2. **`.claude/settings.local.json` is tracked.** It holds one machine's permission allowlist and a
   `G:` drive path. Untracking it means a `.gitignore` change, which also needs the user.

Known gaps with no ROADMAP entry yet, each needing a call on whether to schedule it: the preface
(text before the first `##`) is preserved on save but shown in neither view; an image embed inside
prose renders as a broken wiki-link chip and is listed as an unresolved link; and most sample files
store section-level link lists comma-separated on one line, which the serializer rewrites one per
line on their first save.

Two standing gaps worth not rediscovering as bugs. A schema-drifted file is readable in the app
but cannot be saved from it, which follows from holding ADR-0012 at #9 —
[Data Model](docs/data-model.md#a-drifted-file-is-readable-but-not-saveable). And the shared
controls' component tests cannot reach layout or real focus ordering, so check those flows in a
browser when changing them — [UI consistency audit](docs/ui-consistency-audit.md).
