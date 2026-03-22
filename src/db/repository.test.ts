import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { OnticDatabase } from './dexie'
import {
  LAST_OPENED_WORLD_KEY,
  PersistenceRepository,
} from './repository'
import type {
  MutationRecord,
  QueryRecord,
  QueryResultRecord,
  World,
  WorldVersion,
} from '../types'

function createWorld(worldId = 'world-1', versionId = 'version-1'): {
  world: World
  version: WorldVersion
} {
  return {
    world: {
      id: worldId,
      name: 'Scenario world',
      currentVersionId: versionId,
      createdAt: 1,
      updatedAt: 2,
    },
    version: {
      id: versionId,
      worldId,
      createdAt: 2,
      ontology: {
        nodes: [
          {
            id: 'actor-1',
            type: 'actor',
            label: 'Actor One',
            position: { x: 0, y: 0 },
            data: {},
          },
        ],
        edges: [],
        variables: [],
        actors: [],
        events: [],
        assumptions: [],
      },
    },
  }
}

function createQuery(worldId = 'world-1', versionId = 'version-1'): {
  query: QueryRecord
  result: QueryResultRecord
} {
  return {
    query: {
      id: 'query-1',
      worldId,
      versionId,
      createdAt: 3,
      query: {
        question: 'What happens?',
        targetOutcomes: ['Outcome One'],
        comparisonMode: 'single',
      },
    },
    result: {
      id: 'result-1',
      queryId: 'query-1',
      createdAt: 4,
      result: {
        outcomes: [{ label: 'Outcome One', probability: 1 }],
        keyDrivers: [{ label: 'Budget', impact: 0.8 }],
        modelConfidence: 0.9,
      },
    },
  }
}

function createMutation(worldId = 'world-1', versionId = 'version-2'): {
  mutation: MutationRecord
  world: World
  version: WorldVersion
} {
  return {
    mutation: {
      id: 'mutation-1',
      worldId,
      baseVersionId: 'version-1',
      createdAt: 5,
      patch: {
        patchSummary: 'Add confidence',
        updateNodes: [{ id: 'actor-1', changes: { confidence: 0.7 } }],
      },
    },
    world: {
      id: worldId,
      name: 'Scenario world',
      currentVersionId: versionId,
      createdAt: 1,
      updatedAt: 5,
    },
    version: {
      id: versionId,
      worldId,
      parentVersionId: 'version-1',
      createdAt: 5,
      patchSummary: 'Add confidence',
      ontology: {
        nodes: [
          {
            id: 'actor-1',
            type: 'actor',
            label: 'Actor One',
            position: { x: 0, y: 0 },
            data: { confidence: 0.7 },
          },
        ],
        edges: [],
        variables: [],
        actors: [],
        events: [],
        assumptions: [],
      },
    },
  }
}

describe('PersistenceRepository', () => {
  let database: OnticDatabase
  let repository: PersistenceRepository

  beforeEach(async () => {
    database = new OnticDatabase(`ontic-test-${crypto.randomUUID()}`)
    repository = new PersistenceRepository(database)
    await repository.clearAllData()
  })

  it('creates and restores a world bundle', async () => {
    const { world, version } = createWorld()
    const { query, result } = createQuery()
    const { mutation, world: updatedWorld, version: updatedVersion } = createMutation()

    await repository.createWorld({ world, version })
    await repository.saveQuery({ query, result })
    await repository.saveMutation({
      mutation,
      version: updatedVersion,
      world: updatedWorld,
    })

    const bundle = await repository.loadWorldBundle(world.id)

    expect(bundle).toBeDefined()
    expect(bundle?.world.currentVersionId).toBe(updatedVersion.id)
    expect(bundle?.versions).toHaveLength(2)
    expect(bundle?.queries).toHaveLength(1)
    expect(bundle?.queryResults).toHaveLength(1)
    expect(bundle?.mutations).toHaveLength(1)
  })

  it('restores the last opened world from settings', async () => {
    const first = createWorld('world-1', 'version-1')
    const second = createWorld('world-2', 'version-2')

    await repository.createWorld(first)
    await repository.createWorld(second)
    await repository.setLastOpenedWorldId(second.world.id)

    const restored = await repository.loadLastOpenedWorldBundle()
    const setting = await repository.getSetting<string>(LAST_OPENED_WORLD_KEY)

    expect(setting?.value).toBe(second.world.id)
    expect(restored?.world.id).toBe(second.world.id)
  })

  it('persists arbitrary settings records', async () => {
    await repository.saveSetting('model_tier_config', {
      low: 'openrouter/light',
      medium: 'openrouter/medium',
      high: 'openrouter/heavy',
    })

    const setting = await repository.getSetting<{
      low: string
      medium: string
      high: string
    }>('model_tier_config')

    expect(setting?.value.medium).toBe('openrouter/medium')
    expect(setting?.updatedAt).toBeTypeOf('number')
  })

  it('lists worlds by most recent update time first', async () => {
    await repository.createWorld(createWorld('world-1', 'version-1'))
    await repository.createWorld(createWorld('world-2', 'version-2'))

    await repository.saveWorld({
      id: 'world-1',
      name: 'Older world updated later',
      currentVersionId: 'version-1',
      createdAt: 1,
      updatedAt: 100,
    })

    const worlds = await repository.listWorlds()

    expect(worlds.map((world) => world.id)).toEqual(['world-1', 'world-2'])
  })
})
