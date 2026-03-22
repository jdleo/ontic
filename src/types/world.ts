import type { MutationRecord } from './mutation'
import type { Ontology } from './ontology'
import type { QueryRecord, QueryResultRecord } from './query'

export type World = {
  id: string
  name: string
  currentVersionId: string
  createdAt: number
  updatedAt: number
}

export type WorldVersion = {
  id: string
  worldId: string
  parentVersionId?: string
  createdAt: number
  ontology: Ontology
  patchSummary?: string
}

export type PersistedWorldBundle = {
  world: World
  versions: WorldVersion[]
  queries?: QueryRecord[]
  queryResults?: QueryResultRecord[]
  mutations?: MutationRecord[]
}

export type AppSetting<TValue = unknown> = {
  key: string
  value: TValue
  updatedAt: number
}

export type ModelTierConfig = {
  low: string
  medium: string
  high: string
}

export type PersistedAppState = {
  lastOpenedWorldId?: string
  modelTierConfig?: ModelTierConfig
}
