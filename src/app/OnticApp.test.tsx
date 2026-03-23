import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { OnticApp } from './OnticApp'
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
    loadWorldBundle: vi.fn().mockResolvedValue(undefined),
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

function renderAppMarkup(hasKey = false) {
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
      <OnticApp />
    </WorldStoreContext.Provider>,
  )
}

describe('OnticApp', () => {
  it('renders the three-region shell copy', () => {
    const markup = renderAppMarkup(true)

    expect(markup).toContain('Ontic')
    expect(markup).toContain('Create world')
    expect(markup).toContain('Settings')
    expect(markup).toContain('Ontology graph surface')
    expect(markup).toContain('Version history')
    expect(markup).toContain('Natural-language questions')
  })

  it('renders a blocking setup state when the API key is missing', () => {
    const markup = renderAppMarkup(false)

    expect(markup).toContain('Configure OpenRouter before continuing')
    expect(markup).toContain('LLM-backed flows are blocked until an OpenRouter key is configured')
    expect(markup).toContain('Status: Missing')
    expect(markup).toContain('No world loaded')
  })

  it('shows configured state when the API key is present', () => {
    const markup = renderAppMarkup(true)

    expect(markup).toContain('Access')
    expect(markup).toContain('Parser ready')
    expect(markup).toContain('Settings')
    expect(markup).toContain('No world loaded')
    expect(markup).not.toContain('Configure OpenRouter before continuing')
  })
})
