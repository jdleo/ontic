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

  it('returns a binary probability for single-target queries instead of collapsing to 100%', () => {
    const response = runSimulation({
      ontology: {
        nodes: [
          {
            id: 'actor-1',
            type: 'actor',
            label: 'Actor',
            position: { x: 0, y: 0 },
            data: { confidence: 0.8 },
          },
          {
            id: 'event-1',
            type: 'event',
            label: 'Actor takes action',
            position: { x: 200, y: 0 },
            data: { confidence: 0.55 },
          },
          {
            id: 'belief-1',
            type: 'belief',
            label: 'Caution',
            position: { x: 0, y: 120 },
            data: { confidence: 0.7 },
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'actor-1',
            target: 'event-1',
            type: 'causes',
            data: { weight: 0.6, confidence: 0.7, polarity: 'positive' },
          },
          {
            id: 'edge-2',
            source: 'belief-1',
            target: 'event-1',
            type: 'constrains',
            data: { weight: 0.7, confidence: 0.8, polarity: 'negative' },
          },
        ],
        variables: [],
        actors: [],
        events: [],
        assumptions: [],
      },
      query: {
        question: 'Will the actor take action?',
        targetOutcomes: ['Actor takes action'],
      },
      rolloutCount: 320,
    })

    expect(response.result.outcomes).toHaveLength(2)
    expect(response.result.outcomes[0]?.label).toBe('Actor takes action')
    expect(response.result.outcomes[1]?.label).toBe('Not actor takes action')
    expect(response.result.outcomes[0]?.probability).toBeGreaterThan(0)
    expect(response.result.outcomes[0]?.probability).toBeLessThan(1)
    expect(response.result.outcomes.reduce((sum, item) => sum + item.probability, 0)).toBeCloseTo(1, 4)
  })

  it('uses bounded updates so repeated positive evidence does not immediately saturate to certainty', () => {
    const response = runSimulation({
      ontology: {
        nodes: [
          {
            id: 'shop-a',
            type: 'actor',
            label: 'Shop A',
            position: { x: 0, y: 0 },
            data: { confidence: 1 },
          },
          {
            id: 'objective-a',
            type: 'objective',
            label: 'Goal',
            position: { x: 0, y: 120 },
            data: { confidence: 0.8 },
          },
          {
            id: 'price-cut-a',
            type: 'event',
            label: 'Shop A cuts prices',
            position: { x: 200, y: 0 },
            data: { confidence: 0.5 },
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'shop-a',
            target: 'price-cut-a',
            type: 'causes',
            data: { weight: 0.9, confidence: 0.9, polarity: 'positive' },
          },
          {
            id: 'edge-2',
            source: 'objective-a',
            target: 'price-cut-a',
            type: 'supports',
            data: { weight: 0.8, confidence: 0.8, polarity: 'positive' },
          },
        ],
        variables: [],
        actors: [],
        events: [],
        assumptions: [],
      },
      query: {
        question: 'What is the probability Shop A cuts prices?',
        targetOutcomes: ['Shop A cuts prices'],
      },
      rolloutCount: 320,
    })

    expect(response.result.outcomes[0]?.probability).toBeLessThan(0.95)
    expect(response.result.outcomes[0]?.probability).toBeGreaterThan(0.7)
  })

  it('treats observes edges without explicit polarity as neutral instead of positive support', () => {
    const response = runSimulation({
      ontology: {
        nodes: [
          {
            id: 'shop-a',
            type: 'actor',
            label: 'Shop A',
            position: { x: 0, y: 0 },
            data: { confidence: 0.8 },
          },
          {
            id: 'shop-b',
            type: 'actor',
            label: 'Shop B',
            position: { x: 0, y: 120 },
            data: { confidence: 0.9 },
          },
          {
            id: 'price-cut-a',
            type: 'event',
            label: 'Shop A cuts prices',
            position: { x: 200, y: 0 },
            data: { confidence: 0.5 },
          },
        ],
        edges: [
          {
            id: 'e-a-pricecut',
            source: 'shop-a',
            target: 'price-cut-a',
            type: 'causes',
            data: { weight: 0.5, confidence: 0.5, polarity: 'positive' },
          },
          {
            id: 'e-b-observes-a',
            source: 'shop-b',
            target: 'price-cut-a',
            type: 'observes',
            data: { weight: 1, confidence: 1 },
          },
        ],
        variables: [],
        actors: [],
        events: [],
        assumptions: [],
      },
      query: {
        question: 'What is the probability Shop A cuts prices this week?',
        targetOutcomes: ['Shop A cuts prices'],
      },
      rolloutCount: 320,
    })

    expect(response.result.outcomes[0]?.probability).toBeLessThan(0.8)
    expect(response.result.outcomes[0]?.probability).toBeGreaterThan(0.45)
  })

  it('treats constrains edges without explicit polarity as negative pressure by default', () => {
    const response = runSimulation({
      ontology: {
        nodes: [
          {
            id: 'decision',
            type: 'event',
            label: 'Take action',
            position: { x: 200, y: 0 },
            data: { confidence: 0.6 },
          },
          {
            id: 'constraint',
            type: 'constraint',
            label: 'Risk',
            position: { x: 0, y: 0 },
            data: { confidence: 0.9 },
          },
        ],
        edges: [
          {
            id: 'edge-constraint',
            source: 'constraint',
            target: 'decision',
            type: 'constrains',
            data: { weight: 0.8, confidence: 0.9 },
          },
        ],
        variables: [],
        actors: [],
        events: [],
        assumptions: [],
      },
      query: {
        question: 'Will the action happen?',
        targetOutcomes: ['Take action'],
      },
      rolloutCount: 320,
    })

    expect(response.result.outcomes[0]?.probability).toBeLessThan(0.5)
  })
})
