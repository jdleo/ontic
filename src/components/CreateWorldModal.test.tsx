import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { CreateWorldModal } from './CreateWorldModal'
import { createWorldStore, OPENROUTER_API_KEY_STORAGE_KEY } from '../store/worldStore'
import { WorldStoreContext } from '../store/worldStoreContext'

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

function createPersistenceMocks() {
  return {
    loadLastOpenedWorldBundle: vi.fn().mockResolvedValue(undefined),
    setLastOpenedWorldId: vi.fn().mockResolvedValue(undefined),
    createWorld: vi.fn().mockResolvedValue(undefined),
    saveWorld: vi.fn().mockResolvedValue(undefined),
    saveVersion: vi.fn().mockResolvedValue(undefined),
    saveQuery: vi.fn().mockResolvedValue(undefined),
    saveMutation: vi.fn().mockResolvedValue(undefined),
    saveSetting: vi.fn().mockResolvedValue(undefined),
    getSetting: vi.fn().mockResolvedValue(undefined),
  }
}

function createWorldCreationMocks() {
  return {
    createInitialOntology: vi.fn(),
  }
}

function createSimulationMocks() {
  return {
    run: vi.fn(),
  }
}

function createQueryFlowMocks() {
  return {
    parseQuestion: vi.fn(),
    explainResult: vi.fn(),
  }
}

function createMutationFlowMocks() {
  return {
    parseMutation: vi.fn(),
  }
}

function renderModalMarkup(hasKey = false) {
  const store = createWorldStore({
    persistence: createPersistenceMocks(),
    storage: createMemoryStorage(
      hasKey
        ? {
            [OPENROUTER_API_KEY_STORAGE_KEY]: 'sk-or-v1-test',
          }
        : {},
    ),
    worldCreation: createWorldCreationMocks(),
    simulation: createSimulationMocks(),
    queryFlow: createQueryFlowMocks(),
    mutationFlow: createMutationFlowMocks(),
  })

  return renderToStaticMarkup(
    <WorldStoreContext.Provider value={store}>
      <CreateWorldModal open onClose={() => {}} />
    </WorldStoreContext.Provider>,
  )
}

describe('CreateWorldModal', () => {
  it('renders create-world fields when open', () => {
    const markup = renderModalMarkup(true)

    expect(markup).toContain('Create world')
    expect(markup).toContain('World name')
    expect(markup).toContain('Scenario')
    expect(markup).toContain('Parser ready')
    expect(markup).toContain('Run normalization and repair after parsing')
  })

  it('shows setup guidance when the API key is missing', () => {
    const markup = renderModalMarkup(false)

    expect(markup).toContain('Setup required')
    expect(markup).toContain('Configure OpenRouter in settings before creating a world')
  })
})
