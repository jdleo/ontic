# Ontic

![Lint](https://github.com/jdleo/ontic/actions/workflows/lint.yml/badge.svg)
![Build](https://github.com/jdleo/ontic/actions/workflows/build.yml/badge.svg)
![Test](https://github.com/jdleo/ontic/actions/workflows/test.yml/badge.svg)
![Test Count](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/jdleo/ontic/main/docs/badges/test-count.json)
![React](https://img.shields.io/badge/React-19-20232a?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-9-f69220?logo=pnpm&logoColor=white)

Ontic is a browser-first, local-first ontology and simulation tool for modeling a situation, asking questions about it, and mutating world state over time.

## Screenshot

![Ontic screenshot](docs/readme-screenshot.png)

## What It Does

- Turn a scenario into a structured ontology graph.
- Ask natural-language questions against the current world state.
- Apply interventions as versioned mutations.
- Compare snapshots and probability shifts over time.
- Persist worlds, history, and settings locally in the browser.

## Architecture

```mermaid
flowchart LR
    UI["React App Shell"] --> Store["Zustand Store"]
    Store --> Graph["React Flow Graph Canvas"]
    Store --> Panels["Query / Results / Mutation / History Panels"]
    Store --> Persistence["Dexie + IndexedDB"]
    Store --> QueryFlow["Query Flow"]
    Store --> MutationFlow["Mutation Flow"]
    Store --> WorldCreation["World Creation Flow"]
    QueryFlow --> OpenRouter["OpenRouter Client"]
    MutationFlow --> OpenRouter
    WorldCreation --> OpenRouter
    Store --> Simulation["Simulation Engine / Worker Client"]
    Simulation --> Results["Query Results + Drivers"]
```

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- Dexie / IndexedDB
- React Flow
- Zod

## Local Setup

```bash
pnpm install
pnpm dev
```

## Commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm preview
```

## Notes

- This app is local-first. Worlds and settings are stored in the browser.
- OpenRouter is used for parsing, repair, and explanation flows.
- Product and implementation intent live in [SPEC.md](/Users/johnleonardo/Documents/ontic/docs/SPEC.md) and [DESIGN.md](/Users/johnleonardo/Documents/ontic/docs/DESIGN.md).
