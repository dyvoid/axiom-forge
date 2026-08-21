# 14. Visibility / Access Control

**Date:** 2026-08-21
**Status:** Proposed — skeleton only, design not yet brainstormed

## Context

Nothing in the schema or app distinguishes audiences for the same project. This surfaces
independently across several use cases:

- A GM sharing a campaign project with players has no way to mark GM-only fields or
  entries — sharing means spoiling.
- A novelist wants to flag material "not yet revealed to the reader."
- A small publishing team wants a draft → review → approved status per entry.
- A creator selling access wants free-preview vs. patron-only entries.

Different framing, same underlying primitive: some notion of a visibility or access
level on a field or entry. No ADR currently touches this.

## Decision

Not yet designed. To be brainstormed. Open on:

- Whether this is one general-purpose primitive (a visibility/status enum) or several
  narrower features that happen to look similar.
- Whether it's schema-level (a field/section flag) or file-level (whole entries).

## Open Questions

- Single axis (e.g. a `visibility` enum: public/hidden/draft) or multiple independent
  axes (audience vs. review status vs. paywall tier)?
- Does enforcement matter, or is this display-only (relevant given the server has no
  auth/accounts today — see the Corporate/Internal Lore Wiki gap noted separately)?
- Field-level, section-level, or whole-entry granularity?
- How does this interact with [Multi-Project](0002-multi-project-management.md) — is a
  "player-safe" view a filtered view of the same project, or a separate export?

## Consequences

Not yet assessed — deferred until the design is brainstormed. Worth noting this is the
one gap where the deployment model (single-user local server, no auth) may cap how far
"access control" can meaningfully go without also revisiting that architecture.
