import { describe, expect, it, vi } from 'vitest'
import {
  createWorldStore,
  DEFAULT_GRAPH_PREFERENCES,
  DEFAULT_MODEL_TIER_CONFIG,
  OPENROUTER_API_KEY_STORAGE_KEY,
} from './worldStore'
import { createExportedWorldBundle } from '../lib/importExport'
import type { GraphPreferences, ModelTierConfig, PersistedWorldBundle } from '../types'

function createMemoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial))

  return {
    getItem(key: string) {
      return values.get(key) ?? null
    },
    setItem(key: string, value: string) {
      values.set(key, value)
    },
    removeItem(key: string) {
      values.delete(key)
    },
  }
}

function createPersistenceMocks(bundle?: PersistedWorldBundle) {
  return {
    loadLastOpenedWorldBundle: vi.fn().mockResolvedValue(bundle),
    loadWorldBundle: vi.fn().mockResolvedValue(bundle),
    setLastOpenedWorldId: vi.fn().mockResolvedValue(undefined),
    createWorld: vi.fn().mockResolvedValue(undefined),
    saveWorld: vi.fn().mockResolvedValue(undefined),
    saveVersion: vi.fn().mockResolvedValue(undefined),
    saveQuery: vi.fn().mockResolvedValue(undefined),
    saveMutation: vi.fn().mockResolvedValue(undefined),
    importWorldBundle: vi.fn().mockResolvedValue(undefined),
    clearAllData: vi.fn().mockResolvedValue(undefined),
    saveSetting: vi.fn().mockResolvedValue(undefined),
    getSetting: vi.fn().mockResolvedValue(undefined),
  }
}

function createWorldCreationMocks() {
  return {
    createInitialOntology: vi.fn().mockResolvedValue({
      ok: true as const,
      ontology: {
        nodes: [
          {
            id: 'actor-1',
            type: 'actor',
            label: 'Lead Actor',
            position: { x: 0, y: 0 },
            data: { confidence: 0.8 },
          },
        ],
        edges: [],
        variables: [],
        actors: [],
        events: [],
        assumptions: [],
      },
      rawText: '{"nodes":[]}',
      model: 'heavy-model',
      normalizationSummary: 'Merged duplicate labels and normalized relation types.',
    }),
  }
}

function createSimulationMocks() {
  return {
    run: vi.fn().mockResolvedValue({
      rolloutCount: 300,
      result: {
        outcomes: [{ label: 'Outcome', probability: 1 }],
        keyDrivers: [{ label: 'Actor One', impact: 0.8 }],
        modelConfidence: 0.72,
      },
    }),
  }
}

function createQueryFlowMocks() {
  return {
    parseQuestion: vi.fn().mockResolvedValue({
      ok: true as const,
      data: {
        question: 'What happens next?',
        targetOutcomes: ['Outcome One'],
        focusNodeIds: ['actor-1'],
      },
      model: 'light-model',
      text: '{}',
    }),
    explainResult: vi.fn().mockResolvedValue({
      ok: true as const,
      data: 'Outcome One is favored because Actor One is a strong upstream driver.',
      model: 'light-model',
      text: 'Outcome One is favored because Actor One is a strong upstream driver.',
    }),
  }
}

function createMutationFlowMocks() {
  return {
    parseMutation: vi.fn().mockResolvedValue({
      ok: true as const,
      data: {
        addNodes: [
          {
            id: 'event-2',
            type: 'event',
            label: 'Escalation',
            position: { x: 220, y: 220 },
            data: {},
          },
        ],
        addEdges: [
          {
            id: 'edge-2',
            source: 'actor-1',
            target: 'event-2',
            type: 'causes',
            data: { confidence: 0.7 },
          },
        ],
        patchSummary: 'Escalation update',
      },
      model: 'medium-model',
      text: '{}',
    }),
  }
}

function createBundle(): PersistedWorldBundle {
  return {
    world: {
      id: 'world-1',
      name: 'World One',
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
          nodes: [
            {
              id: 'actor-1',
              type: 'actor',
              label: 'Actor One',
              position: { x: 0, y: 0 },
              data: { confidence: 0.8 },
            },
          ],
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
          nodes: [
            {
              id: 'actor-1',
              type: 'actor',
              label: 'Actor One',
              position: { x: 80, y: 120 },
              data: { confidence: 0.8 },
            },
            {
              id: 'outcome-1',
              type: 'outcome',
              label: 'Outcome One',
              position: { x: 320, y: 200 },
              data: { confidence: 0.65 },
            },
          ],
          edges: [
            {
              id: 'edge-1',
              source: 'actor-1',
              target: 'outcome-1',
              type: 'influences',
              data: { confidence: 0.7, polarity: 'positive', weight: 0.8 },
            },
          ],
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
        createdAt: 3,
        result: {
          outcomes: [{ label: 'Outcome', probability: 1 }],
          keyDrivers: [],
          modelConfidence: 0.9,
        },
      },
    ],
  }
}

describe('worldStore', () => {
  it('hydrates from persistence and storage-backed key presence', async () => {
    const bundle = createBundle()
    const config: ModelTierConfig = {
      low: 'light-model',
      medium: 'medium-model',
      high: 'heavy-model',
    }
    const graphPreferences: GraphPreferences = {
      avoidNodeOverlap: false,
    }

    const persistence = createPersistenceMocks(bundle)
    persistence.getSetting
      .mockResolvedValueOnce({ value: config })
      .mockResolvedValueOnce({ value: graphPreferences })

    const store = createWorldStore({
      persistence,
      storage: createMemoryStorage({
        [OPENROUTER_API_KEY_STORAGE_KEY]: 'secret',
      }),
      worldCreation: createWorldCreationMocks(),
      simulation: createSimulationMocks(),
      queryFlow: createQueryFlowMocks(),
      mutationFlow: createMutationFlowMocks(),
    })

    await store.getState().hydrate()

    const state = store.getState()
    expect(state.currentWorld?.id).toBe('world-1')
    expect(state.currentVersion?.id).toBe('version-2')
    expect(state.currentResult?.modelConfidence).toBe(0.9)
    expect(state.modelTierConfig).toEqual(config)
    expect(state.graphPreferences).toEqual(graphPreferences)
    expect(state.hasOpenRouterKey).toBe(true)
    expect(state.loading.bootstrap).toBe(false)
  })

  it('switches versions and updates graph selection and transient state', async () => {
    const persistence = createPersistenceMocks()
    const store = createWorldStore({
      persistence,
      storage: createMemoryStorage(),
      worldCreation: createWorldCreationMocks(),
      simulation: createSimulationMocks(),
      queryFlow: createQueryFlowMocks(),
      mutationFlow: createMutationFlowMocks(),
    })

    await store.getState().setWorldBundle(createBundle())
    store.getState().selectNode('actor-1')
    store.getState().setActiveQueryInput('What happens next?')
    store.getState().setWorkerJob({
      state: 'running',
      jobId: 'job-1',
      task: 'query',
      startedAt: 10,
    })

    await store.getState().switchVersion('version-1')
    store.getState().resetTransientState()

    const state = store.getState()
    expect(persistence.setLastOpenedWorldId).toHaveBeenCalledWith('world-1')
    expect(state.currentVersion?.id).toBe('version-1')
    expect(state.selectedGraph).toBeNull()
    expect(state.activeQueryInput).toBe('')
    expect(state.workerJob.state).toBe('idle')
  })

  it('persists model tier config updates', async () => {
    const persistence = createPersistenceMocks()
    const store = createWorldStore({
      persistence,
      storage: createMemoryStorage(),
      worldCreation: createWorldCreationMocks(),
      simulation: createSimulationMocks(),
      queryFlow: createQueryFlowMocks(),
      mutationFlow: createMutationFlowMocks(),
    })

    expect(store.getState().modelTierConfig).toEqual(DEFAULT_MODEL_TIER_CONFIG)
    expect(store.getState().graphPreferences).toEqual(DEFAULT_GRAPH_PREFERENCES)

    const nextConfig: ModelTierConfig = {
      low: 'tier-low',
      medium: 'tier-medium',
      high: 'tier-high',
    }

    await store.getState().setModelTierConfig(nextConfig)

    expect(store.getState().modelTierConfig).toEqual(nextConfig)
    expect(persistence.saveSetting).toHaveBeenCalledWith('model_tier_config', nextConfig)
  })

  it('persists graph preference updates', async () => {
    const persistence = createPersistenceMocks()
    const store = createWorldStore({
      persistence,
      storage: createMemoryStorage(),
      worldCreation: createWorldCreationMocks(),
      simulation: createSimulationMocks(),
      queryFlow: createQueryFlowMocks(),
      mutationFlow: createMutationFlowMocks(),
    })

    const nextPreferences: GraphPreferences = {
      avoidNodeOverlap: false,
    }

    await store.getState().setGraphPreferences(nextPreferences)

    expect(store.getState().graphPreferences).toEqual(nextPreferences)
    expect(persistence.saveSetting).toHaveBeenCalledWith('graph_preferences', nextPreferences)
  })

  it('stores and removes the OpenRouter API key without touching other state', async () => {
    const storage = createMemoryStorage()
    const store = createWorldStore({
      persistence: createPersistenceMocks(),
      storage,
      worldCreation: createWorldCreationMocks(),
      simulation: createSimulationMocks(),
      queryFlow: createQueryFlowMocks(),
      mutationFlow: createMutationFlowMocks(),
    })

    store.getState().setOpenRouterApiKey('sk-or-v1-secret')

    expect(storage.getItem(OPENROUTER_API_KEY_STORAGE_KEY)).toBe('sk-or-v1-secret')
    expect(store.getState().hasOpenRouterKey).toBe(true)

    store.getState().removeOpenRouterApiKey()

    expect(storage.getItem(OPENROUTER_API_KEY_STORAGE_KEY)).toBeNull()
    expect(store.getState().hasOpenRouterKey).toBe(false)
    expect(store.getState().currentWorld).toBeNull()
  })

  it('updates ontology graph content and persists the current version', async () => {
    const persistence = createPersistenceMocks()
    const store = createWorldStore({
      persistence,
      storage: createMemoryStorage(),
      worldCreation: createWorldCreationMocks(),
      simulation: createSimulationMocks(),
      queryFlow: createQueryFlowMocks(),
      mutationFlow: createMutationFlowMocks(),
    })

    await store.getState().setWorldBundle(createBundle())
    await store.getState().renameNode('actor-1', 'Lead Actor')
    await store.getState().moveNode('actor-1', { x: 120, y: 160 })
    await store.getState().createEdge({ source: 'outcome-1', target: 'actor-1', type: 'depends_on' })
    store.getState().selectEdge('edge-1')
    await store.getState().deleteSelectedGraphItem()

    const state = store.getState()
    expect(state.currentVersion?.ontology.nodes[0]?.label).toBe('Lead Actor')
    expect(state.currentVersion?.ontology.nodes[0]?.position).toEqual({ x: 120, y: 160 })
    expect(state.versions).toHaveLength(6)
    expect(state.versions[1]?.ontology.nodes[0]?.label).toBe('Actor One')
    expect(state.currentVersion?.ontology.edges).toHaveLength(1)
    expect(state.currentVersion?.ontology.edges[0]?.type).toBe('depends_on')
    expect(persistence.saveVersion).toHaveBeenCalled()
    expect(persistence.saveWorld).toHaveBeenCalled()
  })

  it('creates and loads a persisted world from scenario text', async () => {
    const persistence = createPersistenceMocks()
    const worldCreation = createWorldCreationMocks()
    const store = createWorldStore({
      persistence,
      storage: createMemoryStorage(),
      worldCreation,
      simulation: createSimulationMocks(),
      queryFlow: createQueryFlowMocks(),
      mutationFlow: createMutationFlowMocks(),
    })

    const created = await store.getState().createWorldFromScenario({
      name: 'Trade conflict',
      scenario: 'Two governments compete over semiconductor exports.',
    })

    expect(created).toBe(true)
    expect(worldCreation.createInitialOntology).toHaveBeenCalledWith(
      'Two governments compete over semiconductor exports.',
      { graphPreferences: DEFAULT_GRAPH_PREFERENCES, normalizeAndRepair: true },
    )
    expect(persistence.createWorld).toHaveBeenCalledTimes(1)
    expect(store.getState().currentWorld?.name).toBe('Trade conflict')
    expect(store.getState().versions).toHaveLength(1)
    expect(store.getState().currentVersion?.patchSummary).toBe('Initial world snapshot · cleanup applied')
    expect(store.getState().worldCreationSummary).toContain('Merged duplicate labels')
  })

  it('surfaces parser failures without corrupting state', async () => {
    const persistence = createPersistenceMocks()
    const store = createWorldStore({
      persistence,
      storage: createMemoryStorage(),
      worldCreation: {
        createInitialOntology: vi.fn().mockResolvedValue({
          ok: false as const,
          message: 'The parser returned malformed JSON.',
          cause: new Error('bad json'),
        }),
      },
      simulation: createSimulationMocks(),
      queryFlow: createQueryFlowMocks(),
      mutationFlow: createMutationFlowMocks(),
    })

    const created = await store.getState().createWorldFromScenario({
      name: 'Trade conflict',
      scenario: 'Two governments compete over semiconductor exports.',
    })

    expect(created).toBe(false)
    expect(store.getState().currentWorld).toBeNull()
    expect(store.getState().worldCreationError).toBe('The parser returned malformed JSON.')
    expect(store.getState().worldCreationDebug).toBeNull()
    expect(persistence.createWorld).not.toHaveBeenCalled()
  })

  it('runs simulations through the worker dependency and stores the result', async () => {
    const simulation = createSimulationMocks()
    const store = createWorldStore({
      persistence: createPersistenceMocks(),
      storage: createMemoryStorage(),
      worldCreation: createWorldCreationMocks(),
      simulation,
      queryFlow: createQueryFlowMocks(),
      mutationFlow: createMutationFlowMocks(),
    })

    await store.getState().setWorldBundle(createBundle())

    const result = await store.getState().runSimulation({
      question: 'What happens next?',
      targetOutcomes: ['Outcome One'],
      rolloutCount: 450,
    })

    expect(simulation.run).toHaveBeenCalledWith({
      ontology: store.getState().currentVersion?.ontology,
      query: {
        question: 'What happens next?',
        targetOutcomes: ['Outcome One'],
        rolloutCount: 450,
      },
      rolloutCount: 450,
    })
    expect(result?.modelConfidence).toBe(0.72)
    expect(store.getState().currentResult?.outcomes[0]?.label).toBe('Outcome')
    expect(store.getState().workerJob.state).toBe('idle')
  })

  it('parses, simulates, persists, and highlights a natural-language query', async () => {
    const persistence = createPersistenceMocks()
    const queryFlow = createQueryFlowMocks()
    const store = createWorldStore({
      persistence,
      storage: createMemoryStorage(),
      worldCreation: createWorldCreationMocks(),
      simulation: createSimulationMocks(),
      queryFlow,
      mutationFlow: createMutationFlowMocks(),
    })

    await store.getState().setWorldBundle(createBundle())

    const result = await store.getState().submitQuery('What happens next?')

    expect(queryFlow.parseQuestion).toHaveBeenCalled()
    expect(queryFlow.explainResult).toHaveBeenCalled()
    expect(result?.notes?.[0]).toContain('Outcome One is favored')
    expect(store.getState().highlightedNodeIds).toContain('actor-1')
    expect(store.getState().highlightedEdgeIds).toContain('edge-1')
    expect(persistence.saveQuery).toHaveBeenCalled()
  })

  it('debounces repeated identical queries on the same version', async () => {
    const persistence = createPersistenceMocks()
    const queryFlow = createQueryFlowMocks()
    const store = createWorldStore({
      persistence,
      storage: createMemoryStorage(),
      worldCreation: createWorldCreationMocks(),
      simulation: createSimulationMocks(),
      queryFlow,
      mutationFlow: createMutationFlowMocks(),
    })

    await store.getState().setWorldBundle(createBundle())

    await store.getState().submitQuery('What happens next?')
    await store.getState().submitQuery('What happens next?')

    expect(queryFlow.parseQuestion).toHaveBeenCalledTimes(1)
    expect(persistence.saveQuery).toHaveBeenCalledTimes(1)
  })

  it('creates a new immutable version from a parsed mutation patch', async () => {
    const persistence = createPersistenceMocks()
    const store = createWorldStore({
      persistence,
      storage: createMemoryStorage(),
      worldCreation: createWorldCreationMocks(),
      simulation: createSimulationMocks(),
      queryFlow: createQueryFlowMocks(),
      mutationFlow: createMutationFlowMocks(),
    })

    await store.getState().setWorldBundle(createBundle())

    const nextVersion = await store.getState().submitMutation(
      'Country A attacks Country B logistics hubs.',
    )

    expect(nextVersion?.parentVersionId).toBe('version-2')
    expect(store.getState().versions).toHaveLength(3)
    expect(store.getState().currentVersion?.patchSummary).toBe('Escalation update')
    expect(store.getState().currentVersion?.ontology.nodes.some((node) => node.id === 'event-2')).toBe(true)
    expect(persistence.saveMutation).toHaveBeenCalled()
  })

  it('imports a validated exported bundle as a new local world copy', async () => {
    const persistence = createPersistenceMocks()
    const store = createWorldStore({
      persistence,
      storage: createMemoryStorage(),
      worldCreation: createWorldCreationMocks(),
      simulation: createSimulationMocks(),
      queryFlow: createQueryFlowMocks(),
      mutationFlow: createMutationFlowMocks(),
    })

    const exported = createExportedWorldBundle(createBundle(), { includeHistory: true })
    const imported = await store.getState().importWorldFromJson({
      text: JSON.stringify(exported),
    })

    expect(imported).toBe(true)
    expect(persistence.importWorldBundle).toHaveBeenCalled()
    expect(store.getState().currentWorld?.id).not.toBe('world-1')
    expect(store.getState().versions).toHaveLength(2)
  })

  it('clears local data, storage, and in-memory world state', async () => {
    const persistence = createPersistenceMocks()
    const storage = createMemoryStorage({
      [OPENROUTER_API_KEY_STORAGE_KEY]: 'sk-or-v1-secret',
    })
    const store = createWorldStore({
      persistence,
      storage,
      worldCreation: createWorldCreationMocks(),
      simulation: createSimulationMocks(),
      queryFlow: createQueryFlowMocks(),
      mutationFlow: createMutationFlowMocks(),
    })

    await store.getState().setWorldBundle(createBundle())
    await store.getState().clearLocalData()

    expect(persistence.clearAllData).toHaveBeenCalled()
    expect(storage.getItem(OPENROUTER_API_KEY_STORAGE_KEY)).toBeNull()
    expect(store.getState().currentWorld).toBeNull()
    expect(store.getState().versions).toEqual([])
    expect(store.getState().hasOpenRouterKey).toBe(false)
  })
})
