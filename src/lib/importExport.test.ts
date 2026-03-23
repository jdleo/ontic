import { describe, expect, it } from 'vitest'
import {
  createExportedWorldBundle,
  parseExportedWorldBundle,
  remapImportedBundle,
} from './importExport'
import type { PersistedWorldBundle } from '../types'

function createBundle(): PersistedWorldBundle {
  return {
    world: {
      id: 'world-1',
      name: 'Scenario world',
      currentVersionId: 'version-2',
      createdAt: 1,
      updatedAt: 2,
    },
    versions: [
      {
        id: 'version-1',
        worldId: 'world-1',
        createdAt: 1,
        ontology: {
          nodes: [],
          edges: [],
          variables: [],
          actors: [],
          events: [],
          assumptions: [],
        },
      },
      {
        id: 'version-2',
        worldId: 'world-1',
        parentVersionId: 'version-1',
        createdAt: 2,
        ontology: {
          nodes: [],
          edges: [],
          variables: [],
          actors: [],
          events: [],
          assumptions: [],
        },
      },
    ],
    queries: [
      {
        id: 'query-1',
        worldId: 'world-1',
        versionId: 'version-2',
        createdAt: 3,
        query: {
          question: 'What happens next?',
          targetOutcomes: ['Outcome'],
        },
      },
    ],
    queryResults: [
      {
        id: 'result-1',
        queryId: 'query-1',
        createdAt: 4,
        result: {
          outcomes: [{ label: 'Outcome', probability: 1 }],
          keyDrivers: [],
          modelConfidence: 0.8,
        },
      },
    ],
    mutations: [
      {
        id: 'mutation-1',
        worldId: 'world-1',
        baseVersionId: 'version-1',
        createdAt: 5,
        patch: {
          patchSummary: 'Escalation',
        },
      },
    ],
  }
}

describe('importExport helpers', () => {
  it('creates and parses a portable export document', () => {
    const exported = createExportedWorldBundle(createBundle(), { includeHistory: true })

    expect(parseExportedWorldBundle(JSON.stringify(exported))).toEqual(exported)
  })

  it('can omit history from exports', () => {
    const exported = createExportedWorldBundle(createBundle(), { includeHistory: false })

    expect(exported.bundle.queries).toEqual([])
    expect(exported.bundle.queryResults).toEqual([])
    expect(exported.bundle.mutations).toEqual([])
  })

  it('remaps imported ids to avoid overwriting existing data', () => {
    const imported = remapImportedBundle(createBundle())

    expect(imported.world.id).not.toBe('world-1')
    expect(imported.world.currentVersionId).not.toBe('version-2')
    expect(imported.versions[1]?.parentVersionId).toBe(imported.versions[0]?.id)
    expect(imported.queries?.[0]?.worldId).toBe(imported.world.id)
    expect(imported.queryResults?.[0]?.queryId).toBe(imported.queries?.[0]?.id)
    expect(imported.mutations?.[0]?.worldId).toBe(imported.world.id)
  })
})
