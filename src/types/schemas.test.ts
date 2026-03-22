import { describe, expect, it } from 'vitest'
import type { MutationPatch, Ontology, QueryResult } from './index'
import {
  isProbabilityTotalSensible,
  mutationPatchSchema,
  ontologySchema,
  queryResultSchema,
  validateMutationPatchTargets,
} from './schemas'

function createOntology(): Ontology {
  return {
    nodes: [
      {
        id: 'actor-1',
        type: 'actor',
        label: 'Actor One',
        position: { x: 0, y: 0 },
        data: { observed: true, confidence: 0.9 },
      },
      {
        id: 'outcome-1',
        type: 'outcome',
        label: 'Outcome One',
        position: { x: 240, y: 120 },
        data: {},
      },
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'actor-1',
        target: 'outcome-1',
        type: 'influences',
        data: { weight: 0.7, polarity: 'positive', confidence: 0.8 },
      },
    ],
    variables: [
      {
        id: 'variable-1',
        key: 'support',
        label: 'Support',
        ownerId: 'actor-1',
        distribution: { kind: 'fixed', value: 0.6 },
      },
    ],
    actors: [
      {
        actorId: 'actor-1',
        goals: [{ label: 'Win', weight: 1 }],
        constraints: ['budget'],
        actionSpace: ['campaign'],
        riskTolerance: 0.5,
      },
    ],
    events: [
      {
        id: 'event-1',
        label: 'Initial event',
        timestamp: Date.now(),
        effects: [{ targetType: 'node', targetId: 'actor-1', delta: 1 }],
      },
    ],
    assumptions: [{ id: 'assumption-1', label: 'Stable demand', confidence: 0.8 }],
  }
}

describe('ontologySchema', () => {
  it('accepts a valid ontology', () => {
    expect(() => ontologySchema.parse(createOntology())).not.toThrow()
  })

  it('rejects duplicate node ids', () => {
    const ontology = createOntology()
    ontology.nodes.push({ ...ontology.nodes[0] })

    expect(() => ontologySchema.parse(ontology)).toThrow(/Duplicate node id/)
  })

  it('rejects edges with missing endpoints', () => {
    const ontology = createOntology()
    ontology.edges[0] = { ...ontology.edges[0], target: 'missing-node' }

    expect(() => ontologySchema.parse(ontology)).toThrow(/missing target node/)
  })
})

describe('queryResultSchema', () => {
  it('accepts outcomes that sum to 1', () => {
    const result: QueryResult = {
      outcomes: [
        { label: 'A', probability: 0.4 },
        { label: 'B', probability: 0.6 },
      ],
      keyDrivers: [{ label: 'Budget', impact: 0.7 }],
      modelConfidence: 0.8,
    }

    expect(() => queryResultSchema.parse(result)).not.toThrow()
  })

  it('rejects outcomes with implausible totals', () => {
    const result: QueryResult = {
      outcomes: [
        { label: 'A', probability: 10 },
        { label: 'B', probability: 10 },
      ],
      keyDrivers: [],
      modelConfidence: 0.4,
    }

    expect(() => queryResultSchema.parse(result)).toThrow(/sum to approximately 1 or 100/)
  })

  it('recognizes sensible probability totals', () => {
    expect(isProbabilityTotalSensible([20, 30, 50])).toBe(true)
    expect(isProbabilityTotalSensible([0.25, 0.75])).toBe(true)
    expect(isProbabilityTotalSensible([10, 10])).toBe(false)
  })
})

describe('mutation validation', () => {
  it('accepts a structurally valid mutation patch', () => {
    const patch: MutationPatch = {
      updateNodes: [{ id: 'actor-1', changes: { label: 'Actor Prime' } }],
      patchSummary: 'Rename actor',
    }

    expect(() => mutationPatchSchema.parse(patch)).not.toThrow()
  })

  it('flags missing patch targets against an ontology', () => {
    const issues = validateMutationPatchTargets(createOntology(), {
      updateNodes: [{ id: 'missing-node', changes: { label: 'Nope' } }],
      updateEdges: [{ id: 'missing-edge', changes: { weight: 0.9 } }],
      updateVariables: [{ id: 'missing-variable', changes: { label: 'Renamed' } }],
    })

    expect(issues).toHaveLength(3)
    expect(issues.map((issue) => issue.message).join(' ')).toMatch(/missing node/)
    expect(issues.map((issue) => issue.message).join(' ')).toMatch(/missing edge/)
    expect(issues.map((issue) => issue.message).join(' ')).toMatch(/missing variable/)
  })
})
