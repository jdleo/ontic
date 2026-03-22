import { describe, expect, it, vi } from 'vitest'
import { QueryFlowService } from './queryFlow'

describe('QueryFlowService', () => {
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
})
