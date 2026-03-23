# SPEC

Working product spec for Ontic. Future implementation work should align to this document unless the user explicitly changes scope.

## Product goal

Build a browser-first, local-first ontology and simulation tool where a user can:

- describe a situation in natural language
- generate a structured ontology rendered as a graph
- ask questions and receive percentage-based outcome estimates
- mutate the ontology with natural-language interventions
- compare versioned world states as the graph and probabilities evolve

The ontology is the source of truth. The simulation engine computes outcomes. LLM calls are for parsing, repair, and explanation.

## Core constraints

- [ ] Lightweight implementation
- [ ] Browser-first UX
- [ ] No required backend for MVP
- [ ] Local persistence for worlds, versions, settings, queries, and results
- [ ] Easy local setup
- [x] Explicit graph editing
- [x] Versioned world snapshots
- [ ] OpenRouter-based model access

## MVP stack

- [x] React
- [x] TypeScript
- [x] Vite
- [x] Tailwind CSS
- [x] Zustand
- [x] Dexie over IndexedDB
- [x] React Flow graph editing and visualization
- [x] Zod runtime validation
- [ ] Web Worker simulation execution
- [ ] OpenRouter client integration

## Core modules

- [x] App shell with left sidebar, center canvas, right panel, and settings host
- [x] Core domain types and validation schemas
- [x] Dexie persistence layer
- [x] Zustand app store
- [x] Settings bootstrap for API key and model tiers
- [x] OpenRouter wrapper with LOW, MEDIUM, HIGH model routing
- [x] Situation parsing flow
- [x] Query parsing and simulation flow
- [x] Mutation parsing and version creation flow
- [x] Version history and visual diffs
- [x] Import and export

## Data model

### World

```ts
type World = {
  id: string
  name: string
  currentVersionId: string
  createdAt: number
  updatedAt: number
}
```

### WorldVersion

```ts
type WorldVersion = {
  id: string
  worldId: string
  parentVersionId?: string
  createdAt: number
  ontology: Ontology
  patchSummary?: string
}
```

### Ontology shape

- Nodes
- Edges
- Variables
- Actors
- Events
- Assumptions

These live in `src/types` and must remain validated before entering app state.

## Persistence requirements

- [x] IndexedDB schema for worlds, versions, queries, query results, mutations, and settings
- [x] Typed persistence helpers
- [x] Restore last opened world state
- [x] JSON import and export
- [x] Clear local data from settings

## Validation rules

- [x] Unique node IDs enforced
- [x] Edge endpoint existence enforced
- [x] Query result probabilities checked for sensible totals
- [x] Mutation patch target validity helpers
- [x] Invalid LLM output retry and repair UX

## UX flows

### Create world from text

- [x] Enter scenario text
- [x] Parse to ontology with heavy model
- [x] Validate output
- [x] Save first world version
- [x] Render graph and allow edits

### Ask question

- [x] Enter natural-language question
- [x] Parse to structured query
- [x] Run simulation worker
- [x] Persist query result
- [x] Explain result
- [x] Highlight key drivers

### Mutate world

- [x] Enter intervention text
- [x] Parse to mutation patch
- [x] Validate patch
- [x] Create new world version
- [ ] Recompute or rerun affected query
- [x] Show graph and probability deltas

## Non-goals for MVP

- Auth
- Server database
- Collaboration
- Cloud sync
- Sophisticated equilibrium solving
- Microservices
- Plugin system

## Working rule

If a commit completes one or more unchecked items in this spec, update the relevant checkboxes in the same branch as part of that work.
