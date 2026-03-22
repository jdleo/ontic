# AGENTS

Rolling repo preferences for work in this project.

## Workflow

- Use `pnpm`, not `npm`.
- Create GitHub issues directly when asked, and keep them ordered by dependency when sequencing work.
- Raise pull requests with the related issue linked in the PR body using closing language such as `Closes #<issue>`.
- Default PR title should match the latest commit subject unless the user asks for a different title.

## Git conventions

- Do not prefix branch names with `codex/`.
- Use clear branch names based on the issue or task, for example `issue-1-app-shell`.
- Prefer squash merges for this repository.

## Product and architecture

- Keep the app browser-first and local-first.
- Avoid introducing required backend infrastructure for MVP work unless the user explicitly changes scope.
- Treat the ontology as the source of truth; LLM usage should support parsing, repair, and explanation rather than replace app state.

## Settings and persistence

- Persist user-facing preferences locally when appropriate.
- Favor code-defined defaults with local overrides for configurable model selections and similar settings.
