import { z } from 'zod'
import {
  mutationPatchSchema,
  queryResultSchema,
  structuredQuerySchema,
  worldSchema,
  worldVersionSchema,
} from '../types'
import type { PersistedWorldBundle } from '../types'

const queryRecordSchema = z.object({
  id: z.string().min(1),
  worldId: z.string().min(1),
  versionId: z.string().min(1),
  createdAt: z.number().int(),
  query: structuredQuerySchema,
})

const queryResultRecordSchema = z.object({
  id: z.string().min(1),
  queryId: z.string().min(1),
  createdAt: z.number().int(),
  result: queryResultSchema,
})

const mutationRecordSchema = z.object({
  id: z.string().min(1),
  worldId: z.string().min(1),
  baseVersionId: z.string().min(1),
  createdAt: z.number().int(),
  patch: mutationPatchSchema,
})

export const exportedWorldBundleSchema = z.object({
  format: z.literal('ontic-world-bundle'),
  version: z.literal(1),
  exportedAt: z.number().int(),
  bundle: z.object({
    world: worldSchema,
    versions: z.array(worldVersionSchema),
    queries: z.array(queryRecordSchema).optional(),
    queryResults: z.array(queryResultRecordSchema).optional(),
    mutations: z.array(mutationRecordSchema).optional(),
  }),
})

export type ExportedWorldBundle = z.infer<typeof exportedWorldBundleSchema>

export function createExportedWorldBundle(
  bundle: PersistedWorldBundle,
  input: { includeHistory: boolean },
): ExportedWorldBundle {
  return {
    format: 'ontic-world-bundle',
    version: 1,
    exportedAt: Date.now(),
    bundle: {
      world: bundle.world,
      versions: bundle.versions,
      queries: input.includeHistory ? bundle.queries ?? [] : [],
      queryResults: input.includeHistory ? bundle.queryResults ?? [] : [],
      mutations: input.includeHistory ? bundle.mutations ?? [] : [],
    },
  }
}

export function parseExportedWorldBundle(input: string) {
  return exportedWorldBundleSchema.parse(JSON.parse(input))
}

export function remapImportedBundle(bundle: PersistedWorldBundle): PersistedWorldBundle {
  const nextWorldId = crypto.randomUUID()
  const versionIdMap = new Map(bundle.versions.map((version) => [version.id, crypto.randomUUID()]))
  const queryIdMap = new Map((bundle.queries ?? []).map((query) => [query.id, crypto.randomUUID()]))

  return {
    world: {
      ...bundle.world,
      id: nextWorldId,
      currentVersionId: versionIdMap.get(bundle.world.currentVersionId) ?? crypto.randomUUID(),
      updatedAt: Date.now(),
    },
    versions: bundle.versions.map((version) => ({
      ...version,
      id: versionIdMap.get(version.id) ?? crypto.randomUUID(),
      worldId: nextWorldId,
      parentVersionId: version.parentVersionId
        ? versionIdMap.get(version.parentVersionId)
        : undefined,
    })),
    queries: (bundle.queries ?? []).map((query) => ({
      ...query,
      id: queryIdMap.get(query.id) ?? crypto.randomUUID(),
      worldId: nextWorldId,
      versionId: versionIdMap.get(query.versionId) ?? crypto.randomUUID(),
    })),
    queryResults: (bundle.queryResults ?? []).map((result) => ({
      ...result,
      id: crypto.randomUUID(),
      queryId: queryIdMap.get(result.queryId) ?? crypto.randomUUID(),
    })),
    mutations: (bundle.mutations ?? []).map((mutation) => ({
      ...mutation,
      id: crypto.randomUUID(),
      worldId: nextWorldId,
      baseVersionId: versionIdMap.get(mutation.baseVersionId) ?? crypto.randomUUID(),
    })),
  }
}
