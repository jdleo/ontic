import Dexie, { type EntityTable } from 'dexie'
import type {
  AppSetting,
  MutationRecord,
  QueryRecord,
  QueryResultRecord,
  World,
  WorldVersion,
} from '../types'

export class OnticDatabase extends Dexie {
  worlds!: EntityTable<World, 'id'>
  versions!: EntityTable<WorldVersion, 'id'>
  queries!: EntityTable<QueryRecord, 'id'>
  queryResults!: EntityTable<QueryResultRecord, 'id'>
  mutations!: EntityTable<MutationRecord, 'id'>
  settings!: EntityTable<AppSetting, 'key'>

  constructor(name = 'ontic') {
    super(name)

    this.version(1).stores({
      worlds: 'id, name, updatedAt',
      versions: 'id, worldId, parentVersionId, createdAt',
      queries: 'id, worldId, versionId, createdAt',
      queryResults: 'id, queryId, createdAt',
      mutations: 'id, worldId, baseVersionId, createdAt',
      settings: 'key',
    })
  }
}

export const db = new OnticDatabase()
