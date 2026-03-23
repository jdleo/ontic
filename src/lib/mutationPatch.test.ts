import { describe, expect, it } from 'vitest'
import { applyMutationPatch } from './mutationPatch'

describe('applyMutationPatch', () => {
  it('applies patch updates and additions to an ontology version', () => {
    const result = applyMutationPatch(
      {
        id: 'version-1',
        worldId: 'world-1',
        createdAt: 1,
        ontology: {
          nodes: [
            {
              id: 'actor-1',
              type: 'actor',
              label: 'Actor',
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
      {
        updateNodes: [
          {
            id: 'actor-1',
            changes: { label: 'Updated Actor', confidence: 0.8 },
          },
        ],
        addNodes: [
          {
            id: 'outcome-1',
            type: 'outcome',
            label: 'Outcome',
            position: { x: 100, y: 0 },
            data: {},
          },
        ],
        addEdges: [
          {
            id: 'edge-1',
            source: 'actor-1',
            target: 'outcome-1',
            type: 'causes',
            data: { confidence: 0.7 },
          },
        ],
        patchSummary: 'Escalation update',
      },
    )

    expect(result.ontology.nodes).toHaveLength(2)
    expect(result.ontology.nodes[0]?.label).toBe('Updated Actor')
    expect(result.ontology.edges).toHaveLength(1)
    expect(result.patchSummary).toBe('Escalation update')
  })
})
