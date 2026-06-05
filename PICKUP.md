# PICKUP

Where the last session left off. Update this when you stop, so the next session starts with context
instead of archaeology.

## Current focus

Phase 5 — Project Themes (ADR-0001). Implement a `theme.json`-driven theme system with shipped light/dark base themes and a UI toggle.

## State

- Phases 1–4 complete: read/edit views, live search, tag filtering, backlinks, broken-link detection, project-wide link rewriting on rename.
- Server is strictly single-project via `--project` CLI flag and a single `ProjectStore` instance.
- `tokens.css` has hardcoded Parchment palette (`--bg-page: #f3ead8`, etc.). No dynamic theme injection exists.
- Both ADR-0001 (Themes) and ADR-0002 (Multi-Project) are still **Proposed**.

## Next

1. Draft `Theme` schema in `packages/shared/src/schema.ts`.
2. Build `ThemeContext` in `packages/client/src/context/` that reads a project's `theme.json` (or falls back to built-in base themes) and injects CSS variables into `:root`.
3. Ship `axiom-forge-light` and `axiom-forge-dark` as static JSON assets in the client.
4. Add a theme switcher dropdown to the UI (project theme / light / dark).

## Open questions

- Should `theme.json` live alongside `config.json`, or should `config.json` reference it?
- Should the user's selected theme preference (project/custom/light/dark) persist in `localStorage`?
- Do we keep typography tokens (font families, sizes) in the theme file, or only color/surface tokens?

---

Last updated: 2026-06-05
