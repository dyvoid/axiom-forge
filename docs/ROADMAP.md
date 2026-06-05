# Roadmap

Candidate features in no required order. Each entry links to its ADR for full context, design
reasoning, and consequences. To start a feature: ensure its ADR is Accepted, then build.

## Candidate Features

| Feature | Status | ADR | Notes |
|---|---|---|---|
| In-Memory Document Model | Proposed | [ADR-0003](adr/0003-in-memory-document-model.md) | Prerequisite for Inverse Fields |
| Bidirectional / Inverse Fields | Proposed | [ADR-0004](adr/0004-bidirectional-inverse-fields.md) | Depends on ADR-0003 |
| Project Themes | Proposed | [ADR-0001](adr/0001-project-themes.md) | — |
| Multi-Project Management | Proposed | [ADR-0002](adr/0002-multi-project-management.md) | — |
| Desktop Packaging & Distribution | Proposed | [ADR-0005](adr/0005-desktop-packaging-distribution.md) | Uses Electron and electron-builder |

## Completed

The core feature set shipped in the initial build:

- Read and edit views for all entry types
- Live search with scoring
- Tag filtering
- Backlinks panel ("Linked Mentions")
- Broken-link detection on save
- Project-wide wikilink rewriting on entry rename
