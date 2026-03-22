import { z } from 'zod'
import { comparisonModes } from './query'
import {
  edgePolarities,
  eventEffectTargetTypes,
  ontologyEdgeTypes,
  ontologyNodeTypes,
  variableDistributionKinds,
} from './ontology'
import type { MutationPatch } from './mutation'
import type { Ontology } from './ontology'

const finiteNumber = z.number().finite()
const confidenceNumber = finiteNumber.min(0).max(1)

export const positionSchema = z.object({
  x: finiteNumber,
  y: finiteNumber,
})

export const ontologyNodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(ontologyNodeTypes),
  label: z.string().min(1),
  position: positionSchema,
  data: z.object({
    description: z.string().min(1).optional(),
    attributes: z.record(z.string(), z.unknown()).optional(),
    confidence: confidenceNumber.optional(),
    observed: z.boolean().optional(),
  }),
})

export const ontologyEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  type: z.enum(ontologyEdgeTypes),
  data: z.object({
    weight: finiteNumber.optional(),
    polarity: z.enum(edgePolarities).optional(),
    confidence: confidenceNumber.optional(),
  }),
})

const categoricalOptionSchema = z.object({
  label: z.string().min(1),
  p: confidenceNumber,
})

export const stateVariableDistributionSchema = z
  .object({
    kind: z.enum(variableDistributionKinds),
    value: z.union([finiteNumber, z.string().min(1)]).optional(),
    min: finiteNumber.optional(),
    max: finiteNumber.optional(),
    mean: finiteNumber.optional(),
    std: finiteNumber.positive().optional(),
    options: z.array(categoricalOptionSchema).min(1).optional(),
  })
  .superRefine((distribution, ctx) => {
    if (distribution.kind === 'fixed' && distribution.value === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Fixed distributions require a value.',
      })
    }

    if (distribution.kind === 'uniform') {
      if (distribution.min === undefined || distribution.max === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Uniform distributions require min and max.',
        })
      } else if (distribution.min > distribution.max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Uniform distribution min cannot exceed max.',
        })
      }
    }

    if (distribution.kind === 'normal') {
      if (distribution.mean === undefined || distribution.std === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Normal distributions require mean and std.',
        })
      }
    }

    if (distribution.kind === 'categorical') {
      if (!distribution.options?.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Categorical distributions require options.',
        })
      } else if (!isProbabilityTotalSensible(distribution.options.map((option) => option.p))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Categorical probabilities must sum to approximately 1 or 100.',
        })
      }
    }
  })

export const stateVariableSchema = z.object({
  id: z.string().min(1),
  key: z.string().min(1),
  label: z.string().min(1),
  ownerId: z.string().min(1).optional(),
  distribution: stateVariableDistributionSchema,
})

export const actorGoalSchema = z.object({
  label: z.string().min(1),
  weight: finiteNumber,
})

export const actorModelSchema = z.object({
  actorId: z.string().min(1),
  goals: z.array(actorGoalSchema),
  constraints: z.array(z.string().min(1)),
  actionSpace: z.array(z.string().min(1)),
  riskTolerance: confidenceNumber.optional(),
  timeHorizonDays: z.number().int().nonnegative().optional(),
})

export const worldEventEffectSchema = z.object({
  targetType: z.enum(eventEffectTargetTypes),
  targetId: z.string().min(1),
  delta: finiteNumber.optional(),
  set: z.unknown().optional(),
})

export const worldEventSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1).optional(),
  timestamp: z.number().int(),
  effects: z.array(worldEventEffectSchema).optional(),
})

export const assumptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  confidence: confidenceNumber.optional(),
})

export const ontologySchema = z
  .object({
    nodes: z.array(ontologyNodeSchema),
    edges: z.array(ontologyEdgeSchema),
    variables: z.array(stateVariableSchema),
    actors: z.array(actorModelSchema),
    events: z.array(worldEventSchema),
    assumptions: z.array(assumptionSchema),
  })
  .superRefine((ontology, ctx) => {
    for (const issue of validateOntologyIntegrity(ontology)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: issue.message,
        path: issue.path,
      })
    }
  })

export const worldSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  currentVersionId: z.string().min(1),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export const worldVersionSchema = z.object({
  id: z.string().min(1),
  worldId: z.string().min(1),
  parentVersionId: z.string().min(1).optional(),
  createdAt: z.number().int(),
  ontology: ontologySchema,
  patchSummary: z.string().min(1).optional(),
})

export const structuredQuerySchema = z.object({
  question: z.string().min(1),
  timeframe: z.string().min(1).optional(),
  targetOutcomes: z.array(z.string().min(1)).min(1),
  focusNodeIds: z.array(z.string().min(1)).optional(),
  comparisonMode: z.enum(comparisonModes).optional(),
})

export const queryResultOutcomeSchema = z.object({
  label: z.string().min(1),
  probability: finiteNumber.nonnegative(),
})

export const queryResultDriverSchema = z.object({
  label: z.string().min(1),
  impact: finiteNumber,
})

export const queryResultSchema = z
  .object({
    outcomes: z.array(queryResultOutcomeSchema).min(1),
    keyDrivers: z.array(queryResultDriverSchema),
    modelConfidence: confidenceNumber,
    notes: z.array(z.string().min(1)).optional(),
  })
  .superRefine((result, ctx) => {
    if (!isProbabilityTotalSensible(result.outcomes.map((outcome) => outcome.probability))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Outcome probabilities must sum to approximately 1 or 100.',
        path: ['outcomes'],
      })
    }
  })

export const mutationNodePatchSchema = z.object({
  id: z.string().min(1),
  changes: z
    .object({
      label: z.string().min(1).optional(),
      description: z.string().min(1).optional(),
      attributes: z.record(z.string(), z.unknown()).optional(),
      confidence: confidenceNumber.optional(),
      observed: z.boolean().optional(),
    })
    .refine((changes) => Object.keys(changes).length > 0, {
      message: 'Node patch changes cannot be empty.',
    }),
})

export const mutationEdgePatchSchema = z.object({
  id: z.string().min(1),
  changes: z
    .object({
      type: z.enum(ontologyEdgeTypes).optional(),
      weight: finiteNumber.optional(),
      polarity: z.enum(edgePolarities).optional(),
      confidence: confidenceNumber.optional(),
    })
    .refine((changes) => Object.keys(changes).length > 0, {
      message: 'Edge patch changes cannot be empty.',
    }),
})

export const mutationVariablePatchSchema = z.object({
  id: z.string().min(1),
  changes: stateVariableSchema.partial().refine(
    (changes) => Object.keys(changes).length > 0,
    'Variable patch changes cannot be empty.',
  ),
})

export const mutationPatchSchema = z.object({
  addNodes: z.array(ontologyNodeSchema).optional(),
  updateNodes: z.array(mutationNodePatchSchema).optional(),
  addEdges: z.array(ontologyEdgeSchema).optional(),
  updateEdges: z.array(mutationEdgePatchSchema).optional(),
  addVariables: z.array(stateVariableSchema).optional(),
  updateVariables: z.array(mutationVariablePatchSchema).optional(),
  addEvents: z.array(worldEventSchema).optional(),
  addAssumptions: z.array(assumptionSchema).optional(),
  patchSummary: z.string().min(1).optional(),
})

export type ValidationIssue = {
  message: string
  path?: (string | number)[]
}

export function findDuplicateIds(values: readonly string[]): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value)
    }
    seen.add(value)
  }

  return [...duplicates]
}

export function validateOntologyIntegrity(ontology: Ontology): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const nodeIdSet = new Set(ontology.nodes.map((node) => node.id))
  const edgeIdSet = ontology.edges.map((edge) => edge.id)
  const variableIdSet = ontology.variables.map((variable) => variable.id)
  const eventIdSet = ontology.events.map((event) => event.id)
  const assumptionIdSet = ontology.assumptions.map((assumption) => assumption.id)

  for (const duplicateId of findDuplicateIds(ontology.nodes.map((node) => node.id))) {
    issues.push({
      message: `Duplicate node id "${duplicateId}".`,
      path: ['nodes'],
    })
  }

  for (const duplicateId of findDuplicateIds(edgeIdSet)) {
    issues.push({
      message: `Duplicate edge id "${duplicateId}".`,
      path: ['edges'],
    })
  }

  for (const duplicateId of findDuplicateIds(variableIdSet)) {
    issues.push({
      message: `Duplicate variable id "${duplicateId}".`,
      path: ['variables'],
    })
  }

  for (const duplicateId of findDuplicateIds(eventIdSet)) {
    issues.push({
      message: `Duplicate event id "${duplicateId}".`,
      path: ['events'],
    })
  }

  for (const duplicateId of findDuplicateIds(assumptionIdSet)) {
    issues.push({
      message: `Duplicate assumption id "${duplicateId}".`,
      path: ['assumptions'],
    })
  }

  ontology.edges.forEach((edge, index) => {
    if (!nodeIdSet.has(edge.source)) {
      issues.push({
        message: `Edge "${edge.id}" references missing source node "${edge.source}".`,
        path: ['edges', index, 'source'],
      })
    }

    if (!nodeIdSet.has(edge.target)) {
      issues.push({
        message: `Edge "${edge.id}" references missing target node "${edge.target}".`,
        path: ['edges', index, 'target'],
      })
    }
  })

  ontology.variables.forEach((variable, index) => {
    if (variable.ownerId && !nodeIdSet.has(variable.ownerId)) {
      issues.push({
        message: `Variable "${variable.id}" references missing owner node "${variable.ownerId}".`,
        path: ['variables', index, 'ownerId'],
      })
    }
  })

  const knownTargets = {
    node: nodeIdSet,
    edge: new Set(edgeIdSet),
    variable: new Set(variableIdSet),
    actor: new Set(ontology.actors.map((actor) => actor.actorId)),
  }

  ontology.events.forEach((event, eventIndex) => {
    event.effects?.forEach((effect, effectIndex) => {
      if (!knownTargets[effect.targetType].has(effect.targetId)) {
        issues.push({
          message: `Event "${event.id}" references missing ${effect.targetType} target "${effect.targetId}".`,
          path: ['events', eventIndex, 'effects', effectIndex, 'targetId'],
        })
      }
    })
  })

  ontology.actors.forEach((actor, index) => {
    if (!nodeIdSet.has(actor.actorId)) {
      issues.push({
        message: `Actor model references missing actor node "${actor.actorId}".`,
        path: ['actors', index, 'actorId'],
      })
    }
  })

  return issues
}

export function isProbabilityTotalSensible(probabilities: readonly number[]): boolean {
  if (probabilities.length === 0) {
    return false
  }

  const total = probabilities.reduce((sum, value) => sum + value, 0)
  const tolerance = 0.01

  return Math.abs(total - 1) <= tolerance || Math.abs(total - 100) <= 1
}

export function validateMutationPatchTargets(
  ontology: Ontology,
  patch: MutationPatch,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const nodeIds = new Set(ontology.nodes.map((node) => node.id))
  const edgeIds = new Set(ontology.edges.map((edge) => edge.id))
  const variableIds = new Set(ontology.variables.map((variable) => variable.id))

  patch.updateNodes?.forEach((nodePatch, index) => {
    if (!nodeIds.has(nodePatch.id)) {
      issues.push({
        message: `Node patch references missing node "${nodePatch.id}".`,
        path: ['updateNodes', index, 'id'],
      })
    }
  })

  patch.updateEdges?.forEach((edgePatch, index) => {
    if (!edgeIds.has(edgePatch.id)) {
      issues.push({
        message: `Edge patch references missing edge "${edgePatch.id}".`,
        path: ['updateEdges', index, 'id'],
      })
    }
  })

  patch.updateVariables?.forEach((variablePatch, index) => {
    if (!variableIds.has(variablePatch.id)) {
      issues.push({
        message: `Variable patch references missing variable "${variablePatch.id}".`,
        path: ['updateVariables', index, 'id'],
      })
    }
  })

  patch.addEdges?.forEach((edge, index) => {
    if (!nodeIds.has(edge.source)) {
      issues.push({
        message: `Added edge "${edge.id}" references missing source node "${edge.source}".`,
        path: ['addEdges', index, 'source'],
      })
    }

    if (!nodeIds.has(edge.target)) {
      issues.push({
        message: `Added edge "${edge.id}" references missing target node "${edge.target}".`,
        path: ['addEdges', index, 'target'],
      })
    }
  })

  patch.addVariables?.forEach((variable, index) => {
    if (variable.ownerId && !nodeIds.has(variable.ownerId)) {
      issues.push({
        message: `Added variable "${variable.id}" references missing owner node "${variable.ownerId}".`,
        path: ['addVariables', index, 'ownerId'],
      })
    }
  })

  return issues
}
