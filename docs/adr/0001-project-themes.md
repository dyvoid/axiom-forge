# 1. Project Themes

**Date:** 2026-05-23  
**Status:** Proposed

## Context
Currently, Axiom Forge relies on a hardcoded "Parchment" aesthetic with rust and gold accents defined in `tokens.css`. To allow users to customize their world's aesthetic, we need a theme system that overrides these hardcoded tokens without breaking the application's layout rules.

## Decision
We will implement a `theme.json` file inside the user's project folder.
- We will ship two base themes inside the application: `axiom-forge-light` (the current default) and `axiom-forge-dark`.
- The user's `theme.json` will override the base values.
- The frontend will include a UI toggle/dropdown allowing users to switch between the custom project theme, the default light theme, and the default dark theme.

## Consequences
- The `ProjectContext` (or a new `ThemeContext`) must handle injecting CSS variables dynamically based on the selected theme.
- The UI requires a new dropdown component for theme selection.
- The `config.json` schema might need to be updated or migrated to point to or include the `theme.json`.
