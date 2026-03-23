import { describe, expect, it, vi } from 'vitest'
import { QueryFlowService } from './queryFlow'

describe('QueryFlowService', () => {
  it('rewrites indirect downstream targets to a closer direct ontology node', async () => {
    const callLight = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        question: 'What is the probability Shop A cuts prices this week?',
        targetOutcomes: ['Price War', 'Shop A Gains Customers'],
      },
      model: 'light-model',
      text: '{"question":"What is the probability Shop A cuts prices this week?","targetOutcomes":["Price War","Shop A Gains Customers"]}',
    })

    const service = new QueryFlowService({
      openRouter: { callLight },
    })

    const result = await service.parseQuestion('What is the probability Shop A cuts prices this week?', {
      nodes: [
        { id: 'shop-a', type: 'actor', label: 'Shop A', position: { x: 0, y: 0 }, data: {} },
        { id: 'price-cut-a', type: 'event', label: 'Shop A Price Cut', position: { x: 200, y: 0 }, data: {} },
        { id: 'price-war', type: 'outcome', label: 'Price War', position: { x: 400, y: 0 }, data: {} },
        { id: 'gain-a', type: 'outcome', label: 'Shop A Gains Customers', position: { x: 400, y: 120 }, data: {} },
      ],
      edges: [],
      variables: [],
      actors: [],
      events: [],
      assumptions: [],
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.targetOutcomes).toEqual(['Shop A Price Cut'])
    }
  })

  it('repairs schema-invalid structured query output once', async () => {
    const callLight = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        error: {
          code: 'schema_validation_error',
          message: 'bad schema',
          rawText: '{"question":"What happens?","targetOutcomes":"Outcome One"}',
          issues: [
            {
              code: 'invalid_type',
              expected: 'array',
              path: ['targetOutcomes'],
              message: 'Expected array, received string',
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          question: 'What happens?',
          targetOutcomes: ['Outcome One'],
        },
        model: 'light-model',
        text: '{"question":"What happens?","targetOutcomes":["Outcome One"]}',
      })

    const service = new QueryFlowService({
      openRouter: { callLight },
    })

    const result = await service.parseQuestion('What happens?', {
      nodes: [],
      edges: [],
      variables: [],
      actors: [],
      events: [],
      assumptions: [],
    })

    expect(result.ok).toBe(true)
    expect(callLight).toHaveBeenCalledTimes(2)
  })

  it('keeps a direct target when the parsed node already matches the question closely', async () => {
    const callLight = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        question: 'What is the probability of a price war?',
        targetOutcomes: ['Price War'],
      },
      model: 'light-model',
      text: '{"question":"What is the probability of a price war?","targetOutcomes":["Price War"]}',
    })

    const service = new QueryFlowService({
      openRouter: { callLight },
    })

    const result = await service.parseQuestion('What is the probability of a price war?', {
      nodes: [
        { id: 'price-cut-a', type: 'event', label: 'Shop A Price Cut', position: { x: 0, y: 0 }, data: {} },
        { id: 'price-war', type: 'outcome', label: 'Price War', position: { x: 200, y: 0 }, data: {} },
      ],
      edges: [],
      variables: [],
      actors: [],
      events: [],
      assumptions: [],
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.targetOutcomes).toEqual(['Price War'])
    }
  })
})
