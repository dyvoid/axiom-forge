# 1. Project Themes

**Date:** 2026-05-23, revised 2026-09-12  
**Status:** Accepted

## Context

Axiom Forge ships one hardcoded "Parchment" aesthetic, defined as CSS variables in `tokens.css`.
Projects want some say over how their world looks, but the print aesthetic is load-bearing (see
AGENTS.md), and there is no dark mode or `prefers-color-scheme` handling to build a full theme
system on yet.

The landing hero is the one surface where per-project appearance is cheap and contained. Its
shader is already fully driven by `HeroParams` (`packages/client/src/hero/heroParams.ts`), with a
`?tune` panel that edits every value live. It appears only on `/`, so theming it cannot disturb
the reading and editing UI.

An earlier attempt put a `theme` block with an `accent` color in `config.json`. `ConfigSchema`
never declared it, so it was stripped on load and did nothing. It is deprecated and removed.

## Decision

Themes live in an optional `theme.json` in the project root. With no file, the app uses its own
defaults. `config.json` carries no theme settings.

The file is organized by surface, so later phases add sections rather than restructure it.
**Phase 1 supports only a `hero` section.** A top-level section the app does not know is
reported as a warning and ignored.

```json
{
  "hero": {
    "enabled": true,
    "smoke": "#f6f1e7",
    "background": "#998a73",
    "gold": "#997a47",
    "density": 0.38,
    "speed": 1,
    "size": 1,
    "vignette": { "color": "#000000", "strength": 0.08 },
    "clearTitle": false
  }
}
```

Every field is optional; an omitted field keeps the app default shown above.

| Field | Meaning | Maps to |
|---|---|---|
| `enabled` | `false` removes the hero entirely: no canvas, no WebGL context, the landing page shows the plain page background | not rendering `WebGLHero` |
| `smoke` | Smoke color; the top of its gradient is derived from it | `smokeBottom`, `smokeTop` |
| `background` | Color showing through the gaps | `backgroundColor` |
| `gold` | Tint in the thinnest smoke | `goldColor` |
| `density` (0–1) | How far the smoke is allowed to thin; higher is denser | `smokeMinimum` |
| `speed` (≥ 0) | Animation speed; `0` holds a still frame | `timeSpeed` |
| `size` (> 0) | Shape size; `2` makes the billows twice as large | divides `layerAScale` and `layerBScale` |
| `vignette.color`, `vignette.strength` (0–1) | Edge tint | `vignetteColor`, `vignetteStrength` |
| `clearTitle` | Fill the gaps behind the title instead of in the corners | `maskMode` |

These names are a stable, look-level vocabulary, deliberately not the shader's uniform names. The
other `HeroParams` (noise, warp, thresholds, fades, mask edges, gamma) stay app-level and are
reachable only through `?tune`. That keeps the choices few enough to be usable, and leaves the
shader free to be reworked without breaking any project's file. The names are also chosen to make
sense for the future hero variants `WebGLHero` anticipates.

Loading and delivery:

- The server reads `theme.json` on load and on `reload()`. A missing file is not an error.
- A malformed file, or a value that fails validation, never stops the project loading. The
  offending value falls back to its default and is reported through the existing schema
  warnings.
- Validation lives in `packages/shared/src/schema.ts` beside `ConfigSchema`; the mapping from
  theme fields to `HeroParams` lives with the hero in the client.
- A new `GET /api/theme` returns the validated theme, `{}` when there is no file, matching the
  one-route-per-file pattern of `config` and `schema`.
- The `?tune` panel gains a copy action that emits only the `hero` fields that differ from the
  defaults, ready to paste into `theme.json`.

Later phases are out of scope here and will be decided when they are designed: overriding the
design tokens, base light and dark themes, and a theme switcher.

## Consequences

- `theme.json` becomes part of the on-disk format; `data-model.md` and the README describe it
  once it is built.
- `resolveHeroParams(theme.hero)` becomes the single place a project's choices meet the app
  defaults.
- Phase 1 does not theme the landing type. A project that picks a dark `background` or `smoke`
  can make the muted landing text illegible: moving from the shipped colors to a tan field
  measured roughly 1.4–1.9:1 for the muted text. Phase 1 documents the risk; the token phase is
  where text colors can follow the theme.
- A disabled hero changes nothing else on the landing page, and it avoids WebGL on machines where
  it is slow or unavailable.
- The print-aesthetic objection recorded in the roadmap applies to the later phases, not to
  phase 1, which only touches the landing hero.

## Implementation

Phase 1 is built as decided. Where it landed, and the details the Decision left open:

- `parseTheme` and `ThemeSchema` in `packages/shared/src/schema.ts`; `ProjectStore.loadTheme`
  runs on `load()` and `reload()`; `GET /api/theme` in `packages/server/src/routes/theme.ts`.
- Theme warnings are one entry in `GET /api/warnings` with an empty `folder` and
  `name: "theme.json"`. The warnings dialog is shown by the app shell, so they surface once the
  user leaves the landing page, not on it.
- `resolveHeroParams` and `heroThemeFromParams` live in `packages/client/src/hero/heroTheme.ts`.
  Landing fetches the theme through its own query, outside `ProjectContext`'s loading gate, and
  holds the hero back until that query settles so a project never flashes the default colors.
- `?tune` starts from the project's look and draws the hero even when the theme disables it. Its
  "Copy theme.json" emits only the settings that differ from the defaults and names any tuned
  value theme.json cannot express; its paste box accepts a theme.json as well as a values blob.
