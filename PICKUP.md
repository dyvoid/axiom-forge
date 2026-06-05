# PICKUP

Where the last session left off. Update this when you stop, so the next session starts with context
instead of archaeology. For the feature backlog, see [docs/ROADMAP.md](docs/ROADMAP.md).

## Current Focus

Architecture review complete. We documented two new architectural directions as Proposed ADRs:
1. **[ADR-0006] Encapsulate Folio Mutations:** (High Priority) Move route handler mutation logic into `ProjectStore`. This sets the stage for ADR-0003.
2. **[ADR-0007] Consolidate Folio Integrity Checking:** (Speculative) Consolidate schema validation and wikilink walking into a shared utility.

The implementation plan for ADR-0006 has been drafted. The next session can begin by reviewing `docs/adr/0006-encapsulate-folio-mutations.md` and implementing it.

---

Last updated: 2026-06-05
