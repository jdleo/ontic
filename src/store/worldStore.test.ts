import { describe, expect, it, vi } from 'vitest'
import { createWorldStore, DEFAULT_MODEL_TIER_CONFIG, OPENROUTER_API_KEY_STORAGE_KEY } from './worldStore'
import type { ModelTierConfig, PersistedWorldBundle } from '../types'

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
    setLastOpenedWorldId: vi.fn().mockResolvedValue(undefined),
    saveWorld: vi.fn().mockResolvedValue(undefined),
    saveVersion: vi.fn().mockResolvedValue(undefined),
    saveSetting: vi.fn().mockResolvedValue(undefined),
    getSetting: vi.fn().mockResolvedValue(undefined),
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

    const persistence = createPersistenceMocks(bundle)
    persistence.getSetting.mockResolvedValue({ value: config })

    const store = createWorldStore({
      persistence,
      storage: createMemoryStorage({
        [OPENROUTER_API_KEY_STORAGE_KEY]: 'secret',
      }),
    })

    await store.getState().hydrate()

    const state = store.getState()
    expect(state.currentWorld?.id).toBe('world-1')
    expect(state.currentVersion?.id).toBe('version-2')
    expect(state.currentResult?.modelConfidence).toBe(0.9)
    expect(state.modelTierConfig).toEqual(config)
    expect(state.hasOpenRouterKey).toBe(true)
    expect(state.loading.bootstrap).toBe(false)
  })

  it('switches versions and updates graph selection and transient state', async () => {
    const persistence = createPersistenceMocks()
    const store = createWorldStore({
      persistence,
      storage: createMemoryStorage(),
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
    })

    expect(store.getState().modelTierConfig).toEqual(DEFAULT_MODEL_TIER_CONFIG)

    const nextConfig: ModelTierConfig = {
      low: 'tier-low',
      medium: 'tier-medium',
      high: 'tier-high',
    }

    await store.getState().setModelTierConfig(nextConfig)

    expect(store.getState().modelTierConfig).toEqual(nextConfig)
    expect(persistence.saveSetting).toHaveBeenCalledWith('model_tier_config', nextConfig)
  })

  it('stores and removes the OpenRouter API key without touching other state', async () => {
    const storage = createMemoryStorage()
    const store = createWorldStore({
      persistence: createPersistenceMocks(),
      storage,
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
    expect(state.currentVersion?.ontology.edges).toHaveLength(1)
    expect(state.currentVersion?.ontology.edges[0]?.type).toBe('depends_on')
    expect(persistence.saveVersion).toHaveBeenCalled()
    expect(persistence.saveWorld).toHaveBeenCalled()
  })
})
