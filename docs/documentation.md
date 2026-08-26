# Documentation Discipline

How this repository's docs are kept honest, and what belongs in which file.

## Docs describe what the code does

Never what it *should* do. If a behavior isn't implemented yet, it doesn't go in `docs/` — it
goes in an ADR as a proposed decision.

## Never restate a fact another system owns

Git owns branch and merge state; the pull request owns its own review status; CI owns whether
the build passed. Duplicating any of those into `PICKUP.md`, an ADR, or a README produces a
statement that is true for a few hours and then silently false — and it is *most* misleading
exactly when someone trusts it. "This branch is unmerged", "awaiting review", "N commits ahead"
belong in the pull request description or the commit message, both of which are scoped to the
change and stop being read once it lands.

The test to apply before writing a sentence into a tracked file: **would an ordinary action —
merging, pushing, cutting a release — make this false without anyone editing the file?** If
yes, it goes in the PR or commit message instead. Prefer the durable half: "ADR-0010 is next,
because `rewriteProjectLinks` writes every linking file with no mtime check" stays true
regardless of what has merged.

The same rule bans project history from tracked docs. Git log is the record of what changed and
when. An ADR captures a decision, not the story of the session that implemented it; a completed
housekeeping item is history the moment it lands and should be removed, not checked off forever.

## Size limits

`AGENTS.md` and `PICKUP.md` are capped at **120 lines each**, enforced by
`scripts/check-repo.mjs` under `npm run lint`. They are read first and read often, so they carry
the basics and link out. When one grows past the cap, move the detail into a `docs/` file and
leave a link — do not shrink it by deleting the substance.

`PICKUP.md` should normally sit well under its cap; past ~50 lines it has stopped being a
handoff.

## PICKUP.md scope

A slim handoff file, not a session diary. It exists so the next session starts with context and
next steps in under a minute. Three things go in it:

- **In Progress** — what's half-done, if anything (branch name, what remains)
- **Next Up** — the recommended next work, with enough reasoning that it doesn't need re-deriving
- **Open Decisions** — anything that needs the user's input before work can proceed

What does **not** go in it: completed work that's merged (git log is the record), implementation
details (commit messages and ADRs own the "why" and "how"), and session transcripts. The next
session needs to know where to start, not what the last one did. When you update it, remove
entries for work that's been completed — do not accumulate.

## ADR hygiene

ADRs use a simplified Nygard format — Context, Decision, Consequences — described in
[`adr/README.md`](adr/README.md). Beyond that:

- An ADR records a decision and its reasoning. It is not a build log. Notes such as "revised
  again the same day" or a narrative of what was tried belong in commit messages.
- When an ADR's decision has been implemented, an Implementation section may say where the code
  landed and what deviated from the Decision. Keep it short; the diff is the detail.
- Design rules that outlive the decision (layout idioms, token conventions) belong in
  `design-system.md`, not in the ADR that first proposed them.

## End-of-task checklist

Before closing any feature or architecture task, answer each question explicitly:

- Did any API endpoint change, or was a server behavior added/removed? → Update `architecture.md`
- Did the on-disk Markdown format, field types, or validation rules change? → Update `data-model.md`
- Did any UI convention, design token, or layout rule change? → Update `design-system.md`
- Is this a new feature or a new architectural direction? → Write an ADR in `adr/`
- Did an existing ADR's decision get superseded or changed? → Update its status and link the new one

Then, at the end of **every** session (not just feature or architecture work):

- **Update [`PICKUP.md`](../PICKUP.md)** so the next session starts with context, not archaeology.
- **Update [`ROADMAP.md`](ROADMAP.md)** if any backlog or housekeeping item was started,
  finished, or re-scoped.
- **Re-check the [ADR log](adr/) for correctness** against the work just done — not just the
  status field, the *content*. For every ADR the session touched, overlapped with, or partially
  advanced, ask whether its Context, Decision, or Consequences are still accurate. An ADR that
  quietly drifts out of sync with reality is worse than none. Then act by the ADR's status:
  - **`Proposed`** → still a draft, so **edit the body in place** to match current reality, and
    promote it to `Accepted` only once its decision is actually fully implemented.
  - **`Accepted`** → treat the body as an immutable historical record. **Do not rewrite it.** If
    the work changed or invalidated its decision, set the status to `Superseded` (or `Rejected`
    if abandoned) and write a **new ADR** capturing the new direction, linking the two.
