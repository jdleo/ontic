# AGENTS

Rolling repo preferences for work in this project.

## Workflow

- Use `pnpm`, not `npm`.
- Create GitHub issues directly when asked, and keep them ordered by dependency when sequencing work.
- Raise pull requests with the related issue linked in the PR body using closing language such as `Closes #<issue>`.
- Default PR title should match the latest commit subject unless the user asks for a different title.
- Read [SPEC.md](/Users/johnleonardo/Documents/ontic/SPEC.md) before substantial product work and keep implementation aligned with it unless the user changes scope.
- Read [DESIGN.md](/Users/johnleonardo/Documents/ontic/DESIGN.md) before substantial UI work and keep implementation aligned with it unless the user changes direction.
- If a commit completes unchecked items in `SPEC.md`, update the relevant checkboxes in the same branch as part of that work.

## Git conventions

- Do not prefix branch names with `codex/`.
- Use clear branch names based on the issue or task, for example `issue-1-app-shell`.
- Prefer squash merges for this repository.
- Use conventional-style commit subjects such as `feat: ...`, `fix: ...`, `chore: ...`, `refactor: ...`, `docs: ...`, and `test: ...`.

## Product and architecture

- Keep the app browser-first and local-first.
- Avoid introducing required backend infrastructure for MVP work unless the user explicitly changes scope.
- Treat the ontology as the source of truth; LLM usage should support parsing, repair, and explanation rather than replace app state.

## Settings and persistence

- Persist user-facing preferences locally when appropriate.
- Favor code-defined defaults with local overrides for configurable model selections and similar settings.
