# Git Strategy for Axiom Forge

## Core Approach: Trunk-Based Development

Single `main` branch. Short-lived branches (hours, not days). Everything merges fast or gets scrapped.

---

## Branch Naming

```
main
task/add-theme-switching
experiment/webgl-hero-rewrite
fix/wikilink-parse-edge-case
```

---

## Merging

- **Fast-forward only** — no merge commits, keeps history linear
- **Rebase onto `main`** before merging, never merge `main` into your branch
- **No squashing** — each atomic commit is a meaningful unit; squashing destroys the audit trail

---

## Commits

One commit = one AI task or prompt session. Keep commits atomic and scoped.

AI-generated code has no inherent intent — the commit message is the only record of *why* this
code exists. Use [Conventional Commits](https://www.conventionalcommits.org):

```
feat(client): add theme switching to settings panel
fix(parser): handle wikilinks with trailing spaces
chore(deps): update vitest to 1.x
```

Annotate AI-assisted commits in the body, not the subject:

```
feat(client): add theme switching to settings panel

ai-assisted: claude-sonnet-4-6
```

---

## Generated Sources

Do not commit generated source files. They create noisy diffs and painful merge conflicts. Commit
`package-lock.json` for reproducibility; regenerate `dist/` and build output from source.

---

## Code Review

Review diffs skeptically — AI code looks clean but can be subtly wrong.

High-blast-radius files always get manual review:

- `schema.json` in any project folder
- `packages/shared/src/parser.ts` and `packages/shared/src/schema.ts`
- `.gitignore` and `.gitattributes`
- Anything touching secrets, auth, or permissions
- CI/CD config (`.github/workflows/`)
- Public API endpoints

---

## CI

CI is load-bearing for trunk-based development — slow or weak pipelines break the entire strategy.

Before anything merges to `main`:

- All existing tests must pass (`npm test`)
- Build must succeed (`npm run build`)
- Lint must pass (`npm run lint`)

---

## Branch Protection (GitHub)

Enforce the strategy at the repo level:

- No direct push to `main`
- Require fast-forward / rebase-based merges
- Require CI to pass before merge

---

## Versioning

Tag meaningful milestones with `v<major>.<minor>.<patch>`. Phase completions (Phase 5, Phase 6)
and major feature landings are natural tag points.
