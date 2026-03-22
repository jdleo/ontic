import { describe, expect, it } from 'vitest'
import { runSimulation } from './engine'

describe('runSimulation', () => {
  it('aggregates rollout outcomes into probabilities and drivers', () => {
    const response = runSimulation({
      ontology: {
        nodes: [
          {
            id: 'actor-1',
            type: 'actor',
            label: 'Actor',
            position: { x: 0, y: 0 },
            data: { confidence: 0.9, observed: true },
          },
          {
            id: 'outcome-1',
            type: 'outcome',
            label: 'Outcome A',
            position: { x: 200, y: 0 },
            data: { confidence: 0.6 },
          },
          {
            id: 'outcome-2',
            type: 'outcome',
            label: 'Outcome B',
            position: { x: 200, y: 120 },
            data: { confidence: 0.4 },
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'actor-1',
            target: 'outcome-1',
            type: 'causes',
            data: { weight: 0.9, confidence: 0.8, polarity: 'positive' },
          },
        ],
        variables: [],
        actors: [],
        events: [],
        assumptions: [],
      },
      query: {
        question: 'What happens?',
        targetOutcomes: ['Outcome A', 'Outcome B'],
      },
      rolloutCount: 320,
    })

    expect(response.rolloutCount).toBe(320)
    expect(response.result.outcomes).toHaveLength(2)
    expect(response.result.outcomes.reduce((sum, item) => sum + item.probability, 0)).toBeCloseTo(1, 4)
    expect(response.result.keyDrivers.length).toBeGreaterThan(0)
    expect(response.result.modelConfidence).toBeGreaterThan(0)
  })
})
