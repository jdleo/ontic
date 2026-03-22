import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import {
  MODEL_TIER_CONFIG_KEY,
  persistence,
} from '../db/repository'
import type {
  EdgePolarity,
  ModelTierConfig,
  OntologyEdge,
  OntologyEdgeType,
  OntologyNodeType,
  PersistedWorldBundle,
  QueryResult,
  World,
  WorldVersion,
} from '../types'
import { ontologySchema } from '../types'

export const OPENROUTER_API_KEY_STORAGE_KEY = 'openrouter_api_key'

export const DEFAULT_MODEL_TIER_CONFIG: ModelTierConfig = {
  low: 'minimax/minimax-m2.7',
  medium: 'anthropic/claude-sonnet-4.6',
  high: 'anthropic/claude-opus-4.6',
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
    saveWorld: (world: World) => Promise<void>
    saveVersion: (version: WorldVersion) => Promise<void>
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
  renameNode: (nodeId: string, label: string) => Promise<void>
  moveNode: (nodeId: string, position: { x: number; y: number }) => Promise<void>
  createEdge: (input: { source: string; target: string; type?: OntologyEdgeType }) => Promise<void>
  updateNode: (
    nodeId: string,
    changes: {
      label?: string
      type?: OntologyNodeType
      description?: string
      confidence?: number
      observed?: boolean
    },
  ) => Promise<void>
  updateEdge: (
    edgeId: string,
    changes: {
      type?: OntologyEdgeType
      weight?: number
      confidence?: number
      polarity?: EdgePolarity
    },
  ) => Promise<void>
  deleteSelectedGraphItem: () => Promise<void>
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

function createGraphEdgeId() {
  return `edge-${crypto.randomUUID()}`
}

export function createWorldStore(
  dependencies: StoreDependencies = {
    persistence,
    storage: getBrowserStorage(),
  },
) {
  const persistCurrentVersion = async (
    get: () => WorldStore,
    set: (
      partial:
        | Partial<WorldStore>
        | ((state: WorldStore) => Partial<WorldStore>),
    ) => void,
    updater: (version: WorldVersion, world: World, selection: GraphSelection) => {
      version: WorldVersion
      world?: World
      selectedGraph?: GraphSelection
    } | null,
  ) => {
    const state = get()

    if (!state.currentVersion || !state.currentWorld) {
      return
    }

    const next = updater(state.currentVersion, state.currentWorld, state.selectedGraph)

    if (!next) {
      return
    }

    const validatedVersion: WorldVersion = {
      ...next.version,
      ontology: ontologySchema.parse(next.version.ontology),
    }
    const nextWorld = next.world ?? state.currentWorld

    set((currentState) => ({
      currentVersion: validatedVersion,
      currentWorld: nextWorld,
      versions: currentState.versions.map((candidate) =>
        candidate.id === validatedVersion.id ? validatedVersion : candidate,
      ),
      worldLookup: {
        ...currentState.worldLookup,
        [nextWorld.id]: nextWorld,
      },
      selectedGraph:
        next.selectedGraph === undefined
          ? currentState.selectedGraph
          : next.selectedGraph,
    }))

    await Promise.all([
      get().dependencies.persistence.saveVersion(validatedVersion),
      get().dependencies.persistence.saveWorld(nextWorld),
    ])
  }

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

    async renameNode(nodeId, label) {
      const nextLabel = label.trim()

      if (!nextLabel) {
        return
      }

      await get().updateNode(nodeId, { label: nextLabel })
    },

    async moveNode(nodeId, position) {
      await persistCurrentVersion(get, set, (version) => ({
        version: {
          ...version,
          ontology: {
            ...version.ontology,
            nodes: version.ontology.nodes.map((node) =>
              node.id === nodeId ? { ...node, position } : node,
            ),
          },
        },
      }))
    },

    async createEdge({ source, target, type = 'influences' }) {
      if (source === target) {
        return
      }

      await persistCurrentVersion(get, set, (version) => {
        const duplicate = version.ontology.edges.find(
          (edge) => edge.source === source && edge.target === target && edge.type === type,
        )

        if (duplicate) {
          return null
        }

        const nextEdge: OntologyEdge = {
          id: createGraphEdgeId(),
          source,
          target,
          type,
          data: {
            weight: 0.5,
            polarity: 'positive',
            confidence: 0.65,
          },
        }

        return {
          version: {
            ...version,
            ontology: {
              ...version.ontology,
              edges: [...version.ontology.edges, nextEdge],
            },
          },
          selectedGraph: { kind: 'edge', id: nextEdge.id },
        }
      })
    },

    async updateNode(nodeId, changes) {
      await persistCurrentVersion(get, set, (version) => ({
        version: {
          ...version,
          ontology: {
            ...version.ontology,
            nodes: version.ontology.nodes.map((node) => {
              if (node.id !== nodeId) {
                return node
              }

              return {
                ...node,
                label: changes.label?.trim() || node.label,
                type: changes.type ?? node.type,
                data: {
                  ...node.data,
                  description:
                    'description' in changes ? changes.description : node.data.description,
                  confidence:
                    'confidence' in changes ? changes.confidence : node.data.confidence,
                  observed:
                    'observed' in changes ? changes.observed : node.data.observed,
                },
              }
            }),
          },
        },
      }))
    },

    async updateEdge(edgeId, changes) {
      await persistCurrentVersion(get, set, (version) => ({
        version: {
          ...version,
          ontology: {
            ...version.ontology,
            edges: version.ontology.edges.map((edge) => {
              if (edge.id !== edgeId) {
                return edge
              }

              return {
                ...edge,
                type: changes.type ?? edge.type,
                data: {
                  ...edge.data,
                  weight: 'weight' in changes ? changes.weight : edge.data.weight,
                  confidence:
                    'confidence' in changes ? changes.confidence : edge.data.confidence,
                  polarity: 'polarity' in changes ? changes.polarity : edge.data.polarity,
                },
              }
            }),
          },
        },
      }))
    },

    async deleteSelectedGraphItem() {
      await persistCurrentVersion(get, set, (version, _world, selection) => {
        if (!selection) {
          return null
        }

        if (selection.kind === 'node') {
          return {
            version: {
              ...version,
              ontology: {
                ...version.ontology,
                nodes: version.ontology.nodes.filter((node) => node.id !== selection.id),
                edges: version.ontology.edges.filter(
                  (edge) => edge.source !== selection.id && edge.target !== selection.id,
                ),
              },
            },
            selectedGraph: null,
          }
        }

        return {
          version: {
            ...version,
            ontology: {
              ...version.ontology,
              edges: version.ontology.edges.filter((edge) => edge.id !== selection.id),
            },
          },
          selectedGraph: null,
        }
      })
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
