import {
  MODEL_TIER_CONFIG_KEY,
  persistence,
} from '../db/repository'
import type { ModelTierConfig, PersistedWorldBundle } from '../types'

export async function loadLastOpenedWorld(): Promise<PersistedWorldBundle | undefined> {
  return persistence.loadLastOpenedWorldBundle()
}

export async function loadModelTierConfig(): Promise<ModelTierConfig | undefined> {
  const setting = await persistence.getSetting<ModelTierConfig>(MODEL_TIER_CONFIG_KEY)
  return setting?.value
}
