# Axiom Forge — System Manual

This directory describes the application as it is, not as it is planned to be. What Axiom Forge is
and how to run it: [README](../README.md). The full document index, including the files outside
this directory: [AGENTS.md](../AGENTS.md#document-index).

## Read in this order

Three documents describe the system itself, and they build on each other:

1. [`architecture.md`](architecture.md) — how the npm workspaces monorepo is structured, how the
   Vite frontend and Express backend communicate, API routes, and client routing.
2. [`data-model.md`](data-model.md) — the on-disk contract: `.md` parsing, `schema.json` layouts,
   and save validation.
3. [`design-system.md`](design-system.md) — the print-aesthetic tokens, typography, color, and the
   layout conventions built on them.

The rest of this directory is reference rather than reading order — testing rules, doc discipline,
git strategy, the roadmap and the ADR log. The AGENTS.md index above lists them all.
