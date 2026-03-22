import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import {
  MODEL_TIER_CONFIG_KEY,
  persistence,
} from '../db/repository'
import type {
  ModelTierConfig,
  PersistedWorldBundle,
  QueryResult,
  World,
  WorldVersion,
} from '../types'

export const OPENROUTER_API_KEY_STORAGE_KEY = 'openrouter_api_key'

export const DEFAULT_MODEL_TIER_CONFIG: ModelTierConfig = {
  low: 'openrouter/auto',
  medium: 'openrouter/auto',
  high: 'openrouter/auto',
}

export type GraphSelection =
  | { kind: 'node'; id: string }
  | { kind: 'edge'; id: string }
  | null

export type LoadingState = {
  bootstrap: boolean
  world: boolean
  query: boolean
  mutation: boolean
  settings: boolean
}

export type WorkerJobStatus =
  | { state: 'idle' }
  | { state: 'queued'; jobId: string; task: 'query' | 'mutation' | 'propagation' }
  | { state: 'running'; jobId: string; task: 'query' | 'mutation' | 'propagation'; startedAt: number }
  | { state: 'error'; jobId?: string; task?: 'query' | 'mutation' | 'propagation'; message: string }

export type StoreDependencies = {
  persistence: {
    loadLastOpenedWorldBundle: () => Promise<PersistedWorldBundle | undefined>
    setLastOpenedWorldId: (worldId: string) => Promise<void>
    saveSetting: <TValue>(key: string, value: TValue) => Promise<unknown>
    getSetting: <TValue>(key: string) => Promise<{ value: TValue } | undefined>
  }
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
}

export type WorldStoreState = {
  currentWorld: World | null
  currentVersion: WorldVersion | null
  versions: WorldVersion[]
  worldLookup: Record<string, World>
  selectedGraph: GraphSelection
  activeQueryInput: string
  activeMutationInput: string
  currentResult: QueryResult | null
  modelTierConfig: ModelTierConfig
  hasOpenRouterKey: boolean
  loading: LoadingState
  workerJob: WorkerJobStatus
  dependencies: StoreDependencies
}

export type WorldStoreActions = {
  hydrate: () => Promise<void>
  setWorldBundle: (bundle: PersistedWorldBundle | undefined) => Promise<void>
  registerWorlds: (worlds: World[]) => void
  switchVersion: (versionId: string) => Promise<void>
  selectNode: (nodeId: string | null) => void
  selectEdge: (edgeId: string | null) => void
  clearSelection: () => void
  setActiveQueryInput: (value: string) => void
  setActiveMutationInput: (value: string) => void
  setCurrentResult: (result: QueryResult | null) => void
  setModelTierConfig: (config: ModelTierConfig) => Promise<void>
  setOpenRouterApiKey: (apiKey: string) => void
  removeOpenRouterApiKey: () => void
  refreshOpenRouterKeyPresence: () => void
  setLoadingState: (key: keyof LoadingState, value: boolean) => void
  setWorkerJob: (status: WorkerJobStatus) => void
  resetTransientState: () => void
}

export type WorldStore = WorldStoreState & WorldStoreActions

function getBrowserStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage
  }

  const memory = new Map<string, string>()
  return {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => {
      memory.set(key, value)
    },
    removeItem: (key) => {
      memory.delete(key)
    },
  }
}

function createInitialState(dependencies: StoreDependencies): WorldStoreState {
  const storedApiKey = dependencies.storage.getItem(OPENROUTER_API_KEY_STORAGE_KEY)?.trim() ?? ''

  return {
    currentWorld: null,
    currentVersion: null,
    versions: [],
    worldLookup: {},
    selectedGraph: null,
    activeQueryInput: '',
    activeMutationInput: '',
    currentResult: null,
    modelTierConfig: DEFAULT_MODEL_TIER_CONFIG,
    hasOpenRouterKey: storedApiKey.length > 0,
    loading: {
      bootstrap: false,
      world: false,
      query: false,
      mutation: false,
      settings: false,
    },
    workerJob: { state: 'idle' },
    dependencies,
  }
}

export function createWorldStore(
  dependencies: StoreDependencies = {
    persistence,
    storage: getBrowserStorage(),
  },
) {
  return createStore<WorldStore>((set, get) => ({
    ...createInitialState(dependencies),

    async hydrate() {
      get().setLoadingState('bootstrap', true)

      try {
        const [bundle, modelTierSetting] = await Promise.all([
          get().dependencies.persistence.loadLastOpenedWorldBundle(),
          get().dependencies.persistence.getSetting<ModelTierConfig>(MODEL_TIER_CONFIG_KEY),
        ])

        if (bundle) {
          await get().setWorldBundle(bundle)
        }

        if (modelTierSetting?.value) {
          set({ modelTierConfig: modelTierSetting.value })
        }

        get().refreshOpenRouterKeyPresence()
      } finally {
        get().setLoadingState('bootstrap', false)
      }
    },

    async setWorldBundle(bundle) {
      if (!bundle) {
        set({
          currentWorld: null,
          currentVersion: null,
          versions: [],
          currentResult: null,
        })
        return
      }

      const currentVersion =
        bundle.versions.find((version) => version.id === bundle.world.currentVersionId) ??
        bundle.versions.at(-1) ??
        null

      set((state) => ({
        currentWorld: bundle.world,
        currentVersion,
        versions: bundle.versions,
        worldLookup: {
          ...state.worldLookup,
          [bundle.world.id]: bundle.world,
        },
        currentResult: bundle.queryResults?.at(-1)?.result ?? null,
      }))

      await get().dependencies.persistence.setLastOpenedWorldId(bundle.world.id)
    },

    registerWorlds(worlds) {
      set((state) => ({
        worldLookup: worlds.reduce<Record<string, World>>((lookup, world) => {
          lookup[world.id] = world
          return lookup
        }, { ...state.worldLookup }),
      }))
    },

    async switchVersion(versionId) {
      const state = get()
      const version = state.versions.find((candidate) => candidate.id === versionId)

      if (!version || !state.currentWorld) {
        return
      }

      const nextWorld = {
        ...state.currentWorld,
        currentVersionId: version.id,
      }

      set({
        currentVersion: version,
        currentWorld: nextWorld,
      })

      await get().dependencies.persistence.setLastOpenedWorldId(nextWorld.id)
    },

    selectNode(nodeId) {
      set({
        selectedGraph: nodeId ? { kind: 'node', id: nodeId } : null,
      })
    },

    selectEdge(edgeId) {
      set({
        selectedGraph: edgeId ? { kind: 'edge', id: edgeId } : null,
      })
    },

    clearSelection() {
      set({ selectedGraph: null })
    },

    setActiveQueryInput(value) {
      set({ activeQueryInput: value })
    },

    setActiveMutationInput(value) {
      set({ activeMutationInput: value })
    },

    setCurrentResult(result) {
      set({ currentResult: result })
    },

    async setModelTierConfig(config) {
      set({ modelTierConfig: config })
      await get().dependencies.persistence.saveSetting(MODEL_TIER_CONFIG_KEY, config)
    },

    setOpenRouterApiKey(apiKey) {
      get().dependencies.storage.setItem(OPENROUTER_API_KEY_STORAGE_KEY, apiKey)
      set({ hasOpenRouterKey: apiKey.trim().length > 0 })
    },

    removeOpenRouterApiKey() {
      get().dependencies.storage.removeItem(OPENROUTER_API_KEY_STORAGE_KEY)
      set({ hasOpenRouterKey: false })
    },

    refreshOpenRouterKeyPresence() {
      set({
        hasOpenRouterKey: Boolean(
          get().dependencies.storage.getItem(OPENROUTER_API_KEY_STORAGE_KEY),
        ),
      })
    },

    setLoadingState(key, value) {
      set((state) => ({
        loading: {
          ...state.loading,
          [key]: value,
        },
      }))
    },

    setWorkerJob(status) {
      set({ workerJob: status })
    },

    resetTransientState() {
      set((state) => ({
        selectedGraph: null,
        activeQueryInput: '',
        activeMutationInput: '',
        currentResult: null,
        workerJob: { state: 'idle' },
        loading: {
          ...state.loading,
          query: false,
          mutation: false,
        },
      }))
    },
  }))
}

export const worldStore = createWorldStore()

export function useWorldStore<TSelected>(
  selector: (state: WorldStore) => TSelected,
): TSelected {
  return useStore(worldStore, selector)
}
