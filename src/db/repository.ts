import { db, OnticDatabase } from './dexie'
import type {
  AppSetting,
  MutationRecord,
  PersistedWorldBundle,
  QueryRecord,
  QueryResultRecord,
  World,
  WorldVersion,
} from '../types'

export const LAST_OPENED_WORLD_KEY = 'last_opened_world_id'
export const MODEL_TIER_CONFIG_KEY = 'model_tier_config'

export type CreateWorldInput = {
  world: World
  version: WorldVersion
}

export type SaveQueryInput = {
  query: QueryRecord
  result?: QueryResultRecord
}

export type SaveMutationInput = {
  mutation: MutationRecord
  version: WorldVersion
  world: World
}

export type ImportWorldBundleInput = {
  bundle: PersistedWorldBundle
}

export class PersistenceRepository {
  private readonly database: OnticDatabase

  constructor(database: OnticDatabase = db) {
    this.database = database
  }

  async createWorld({ world, version }: CreateWorldInput): Promise<void> {
    await this.database.transaction('rw', this.database.worlds, this.database.versions, async () => {
      await this.database.worlds.put(world)
      await this.database.versions.put(version)
    })
  }

  async saveWorld(world: World): Promise<void> {
    await this.database.worlds.put(world)
  }

  async saveVersion(version: WorldVersion): Promise<void> {
    await this.database.versions.put(version)
  }

  async saveQuery({ query, result }: SaveQueryInput): Promise<void> {
    await this.database.transaction(
      'rw',
      this.database.queries,
      this.database.queryResults,
      async () => {
        await this.database.queries.put(query)

        if (result) {
          await this.database.queryResults.put(result)
        }
      },
    )
  }

  async saveMutation({ mutation, version, world }: SaveMutationInput): Promise<void> {
    await this.database.transaction(
      'rw',
      this.database.mutations,
      this.database.versions,
      this.database.worlds,
      async () => {
        await this.database.mutations.put(mutation)
        await this.database.versions.put(version)
        await this.database.worlds.put(world)
      },
    )
  }

  async importWorldBundle({ bundle }: ImportWorldBundleInput): Promise<void> {
    await this.database.transaction(
      'rw',
      this.database.tables,
      async () => {
        await this.database.worlds.put(bundle.world)
        await this.database.versions.bulkPut(bundle.versions)

        if (bundle.queries?.length) {
          await this.database.queries.bulkPut(bundle.queries)
        }

        if (bundle.queryResults?.length) {
          await this.database.queryResults.bulkPut(bundle.queryResults)
        }

        if (bundle.mutations?.length) {
          await this.database.mutations.bulkPut(bundle.mutations)
        }
      },
    )
  }

  async saveSetting<TValue>(key: string, value: TValue): Promise<AppSetting<TValue>> {
    const record: AppSetting<TValue> = {
      key,
      value,
      updatedAt: Date.now(),
    }

    await this.database.settings.put(record)
    return record
  }

  async getSetting<TValue>(key: string): Promise<AppSetting<TValue> | undefined> {
    return this.database.settings.get(key) as Promise<AppSetting<TValue> | undefined>
  }

  async deleteSetting(key: string): Promise<void> {
    await this.database.settings.delete(key)
  }

  async setLastOpenedWorldId(worldId: string): Promise<void> {
    await this.saveSetting(LAST_OPENED_WORLD_KEY, worldId)
  }

  async getLastOpenedWorldId(): Promise<string | undefined> {
    const setting = await this.getSetting<string>(LAST_OPENED_WORLD_KEY)
    return setting?.value
  }

  async listWorlds(): Promise<World[]> {
    return this.database.worlds.orderBy('updatedAt').reverse().toArray()
  }

  async getWorld(worldId: string): Promise<World | undefined> {
    return this.database.worlds.get(worldId)
  }

  async getWorldVersions(worldId: string): Promise<WorldVersion[]> {
    return this.database.versions.where('worldId').equals(worldId).sortBy('createdAt')
  }

  async getQueriesForWorld(worldId: string): Promise<QueryRecord[]> {
    return this.database.queries.where('worldId').equals(worldId).sortBy('createdAt')
  }

  async getQueryResultsForWorld(worldId: string): Promise<QueryResultRecord[]> {
    const queries = await this.getQueriesForWorld(worldId)

    if (queries.length === 0) {
      return []
    }

    const results = await Promise.all(
      queries.map((query) => this.database.queryResults.where('queryId').equals(query.id).toArray()),
    )

    return results.flat().sort((left, right) => left.createdAt - right.createdAt)
  }

  async getMutationsForWorld(worldId: string): Promise<MutationRecord[]> {
    return this.database.mutations.where('worldId').equals(worldId).sortBy('createdAt')
  }

  async loadWorldBundle(worldId: string): Promise<PersistedWorldBundle | undefined> {
    const world = await this.getWorld(worldId)

    if (!world) {
      return undefined
    }

    const [versions, queries, queryResults, mutations] = await Promise.all([
      this.getWorldVersions(worldId),
      this.getQueriesForWorld(worldId),
      this.getQueryResultsForWorld(worldId),
      this.getMutationsForWorld(worldId),
    ])

    return {
      world,
      versions,
      queries,
      queryResults,
      mutations,
    }
  }

  async loadLastOpenedWorldBundle(): Promise<PersistedWorldBundle | undefined> {
    const worldId = await this.getLastOpenedWorldId()

    if (!worldId) {
      return undefined
    }

    return this.loadWorldBundle(worldId)
  }

  async clearAllData(): Promise<void> {
    await this.database.transaction('rw', this.database.tables, async () => {
      await Promise.all(this.database.tables.map((table) => table.clear()))
    })
  }
}

export const persistence = new PersistenceRepository()
