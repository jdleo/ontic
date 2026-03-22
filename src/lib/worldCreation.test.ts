import { describe, expect, it, vi } from 'vitest'
import { WorldCreationService } from './worldCreation'

describe('WorldCreationService', () => {
  it('normalizes missing node positions before validation', async () => {
    const service = new WorldCreationService({
      openRouter: {
        callHeavy: vi.fn().mockResolvedValue({
          ok: true,
          model: 'heavy-model',
          text: '{"nodes":[]}',
          data: {
            nodes: [
              {
                id: 'actor-1',
                type: 'actor',
                label: 'Lead actor',
                data: { confidence: 0.8 },
              },
              {
                id: 'outcome-1',
                type: 'outcome',
                label: 'Export slowdown',
                position: { x: 400, y: 200 },
                data: { confidence: 0.6 },
              },
            ],
            edges: [
              {
                id: 'edge-1',
                source: 'actor-1',
                target: 'outcome-1',
                type: 'influences',
                data: { confidence: 0.7, polarity: 'positive', weight: 0.8 },
              },
            ],
            variables: [],
            actors: [],
            events: [],
            assumptions: [],
          },
        }),
      },
    })

    const result = await service.createInitialOntology('A trade conflict escalates.')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.ontology.nodes[0]?.position).toEqual({ x: 120, y: 120 })
      expect(result.ontology.nodes[1]?.position).toEqual({ x: 400, y: 200 })
    }
  })

  it('returns a user-facing validation error when the model output is invalid', async () => {
    const service = new WorldCreationService({
      openRouter: {
        callHeavy: vi.fn().mockResolvedValue({
          ok: false,
          error: {
            code: 'schema_validation_error',
            message: 'bad schema',
          },
        }),
      },
    })

    const result = await service.createInitialOntology('A trade conflict escalates.')

    expect(result).toEqual({
      ok: false,
      message: 'The parser returned JSON, but it failed ontology validation. No world was saved.',
      debugMessage: '{"code":"schema_validation_error","message":"bad schema"}',
      cause: {
        code: 'schema_validation_error',
        message: 'bad schema',
      },
    })
  })

  it('preserves the underlying network error message for debugging', async () => {
    const error = new TypeError('Failed to fetch')
    const service = new WorldCreationService({
      openRouter: {
        callHeavy: vi.fn().mockResolvedValue({
          ok: false,
          error: {
            code: 'network_error',
            message: 'network',
            cause: error,
          },
        }),
      },
    })

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await service.createInitialOntology('A trade conflict escalates.')

    expect(result).toEqual({
      ok: false,
      message: 'The parser request failed before reaching OpenRouter. Check your connection and try again.',
      debugMessage: 'Failed to fetch',
      cause: {
        code: 'network_error',
        message: 'network',
        cause: error,
      },
    })
    expect(consoleError).toHaveBeenCalled()

    consoleError.mockRestore()
  })

  it('retries once to repair schema-invalid ontology output', async () => {
    const callHeavy = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        error: {
          code: 'schema_validation_error',
          message: 'bad schema',
          rawText:
            '{"nodes":[{"id":"a","type":"actor","label":"Actor","data":{}}],"edges":[{"id":"e","source":"a","target":"b","type":"causal","data":{"description":"bad"}}],"variables":[],"actors":[],"events":[],"assumptions":[]}',
          issues: [
            {
              code: 'invalid_value',
              values: ['influences'],
              path: ['edges', 0, 'type'],
              message: 'Invalid option: expected one of "influences"|...',
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        model: 'heavy-model',
        text:
          '{"nodes":[{"id":"a","type":"actor","label":"Actor","data":{}},{"id":"b","type":"outcome","label":"Outcome","data":{}}],"edges":[{"id":"e","source":"a","target":"b","type":"causes","data":{"confidence":0.7}}],"variables":[],"actors":[],"events":[],"assumptions":[]}',
        data: {
          nodes: [
            {
              id: 'a',
              type: 'actor',
              label: 'Actor',
              data: {},
            },
            {
              id: 'b',
              type: 'outcome',
              label: 'Outcome',
              data: {},
            },
          ],
          edges: [
            {
              id: 'e',
              source: 'a',
              target: 'b',
              type: 'causes',
              data: { confidence: 0.7 },
            },
          ],
          variables: [],
          actors: [],
          events: [],
          assumptions: [],
        },
      })

    const service = new WorldCreationService({
      openRouter: { callHeavy },
    })

    const result = await service.createInitialOntology('A trade conflict escalates.')

    expect(result.ok).toBe(true)
    expect(callHeavy).toHaveBeenCalledTimes(2)
    expect(callHeavy.mock.calls[1]?.[0]).toMatchObject({
      temperature: 0,
      messages: expect.any(Array),
    })
  })
})
