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
        callMedium: vi.fn(),
      },
    })

    const result = await service.createInitialOntology('A trade conflict escalates.')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.ontology.nodes[0]?.position.x).toBeLessThan(
        result.ontology.nodes[1]?.position.x ?? 0,
      )
      expect(result.ontology.nodes[0]?.position).not.toEqual(result.ontology.nodes[1]?.position)
    }
  })

  it('lays out generated nodes from upstream to downstream columns', async () => {
    const service = new WorldCreationService({
      openRouter: {
        callHeavy: vi.fn().mockResolvedValue({
          ok: true,
          model: 'heavy-model',
          text: '{"nodes":[]}',
          data: {
            nodes: [
              { id: 'actor-1', type: 'actor', label: 'Actor', data: {} },
              { id: 'event-1', type: 'event', label: 'Shock', data: {} },
              { id: 'outcome-1', type: 'outcome', label: 'Outcome', data: {} },
            ],
            edges: [
              {
                id: 'edge-1',
                source: 'actor-1',
                target: 'event-1',
                type: 'causes',
                data: { confidence: 0.7 },
              },
              {
                id: 'edge-2',
                source: 'event-1',
                target: 'outcome-1',
                type: 'causes',
                data: { confidence: 0.7 },
              },
            ],
            variables: [],
            actors: [],
            events: [],
            assumptions: [],
          },
        }),
        callMedium: vi.fn(),
      },
    })

    const result = await service.createInitialOntology('A shock leads to an outcome.')

    expect(result.ok).toBe(true)
    if (result.ok) {
      const positions = Object.fromEntries(
        result.ontology.nodes.map((node) => [node.id, node.position]),
      )

      expect(positions['actor-1']?.x).toBeLessThan(positions['event-1']?.x ?? 0)
      expect(positions['event-1']?.x).toBeLessThan(positions['outcome-1']?.x ?? 0)
    }
  })

  it('tells the model to leave unsupported top-level arrays empty unless it can match the exact schema', async () => {
    const callHeavy = vi.fn().mockResolvedValue({
      ok: true,
      model: 'heavy-model',
      text: '{"nodes":[],"edges":[],"variables":[],"actors":[],"events":[],"assumptions":[]}',
      data: {
        nodes: [],
        edges: [],
        variables: [],
        actors: [],
        events: [],
        assumptions: [],
      },
    })
    const service = new WorldCreationService({
      openRouter: {
        callHeavy,
        callMedium: vi.fn(),
      },
    })

    await service.createInitialOntology('Two rival coffee shops consider cutting prices.')

    expect(callHeavy).toHaveBeenCalledTimes(1)
    const prompt = callHeavy.mock.calls[0]?.[0]?.prompt

    expect(prompt?.user).toContain('Variables must match exactly: { id, key, label, ownerId?, distribution }.')
    expect(prompt?.user).toContain('If unsure, leave variables empty.')
    expect(prompt?.user).toContain('Categorical distributions must use options, not values/weights.')
    expect(prompt?.user).toContain('Valid categorical example: {"kind":"categorical","options":[{"label":"current","p":0.5},{"label":"discounted","p":0.5}]}')
    expect(prompt?.user).toContain('Do not use keys named values or weights inside distribution.')
    expect(prompt?.user).toContain('Actors must match exactly: { actorId, goals, constraints, actionSpace, riskTolerance?, timeHorizonDays? }. If unsure, leave actors empty.')
    expect(prompt?.user).toContain('Events must match exactly: { id, label, description?, timestamp, effects? }. If unsure, leave events empty.')
    expect(prompt?.user).toContain('Assumptions must be objects like { id, label, confidence? }. Do not return plain strings. If unsure, leave assumptions empty.')
    expect(prompt?.user).toContain('Do not return arrays of strings for actors, events, or assumptions.')
    expect(prompt?.user).toContain('Actor goals must be objects like [{ "label": "Preserve margin", "weight": 0.8 }], not strings.')
    expect(prompt?.user).toContain('Event timestamps must be integer unix milliseconds, not ISO strings.')
    expect(prompt?.user).toContain('Event effects must be objects like [{ "targetType": "node", "targetId": "shop-a", "delta": 0.2 }], not plain strings.')
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
        callMedium: vi.fn(),
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
        callMedium: vi.fn(),
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
    const callMedium = vi.fn()

    const service = new WorldCreationService({
      openRouter: { callHeavy, callMedium },
    })

    const result = await service.createInitialOntology('A trade conflict escalates.')

    expect(result.ok).toBe(true)
    expect(callHeavy).toHaveBeenCalledTimes(2)
    expect(callHeavy.mock.calls[1]?.[0]).toMatchObject({
      temperature: 0,
      messages: expect.any(Array),
    })
  })

  it('runs the optional normalization pass and returns a cleanup summary', async () => {
    const service = new WorldCreationService({
      openRouter: {
        callHeavy: vi.fn().mockResolvedValue({
          ok: true,
          model: 'heavy-model',
          text: '{"nodes":[]}',
          data: {
            nodes: [
              { id: 'actor-1', type: 'actor', label: 'US Government', data: {} },
              { id: 'actor-2', type: 'actor', label: 'United States Government', data: {} },
            ],
            edges: [],
            variables: [],
            actors: [],
            events: [],
            assumptions: [],
          },
        }),
        callMedium: vi.fn().mockResolvedValue({
          ok: true,
          model: 'medium-model',
          text: '{"ontology":{}}',
          data: {
            ontology: {
              nodes: [
                {
                  id: 'actor-1',
                  type: 'actor',
                  label: 'United States Government',
                  data: {
                    attributes: {
                      aliases: ['US Government'],
                    },
                  },
                },
              ],
              edges: [],
              variables: [],
              actors: [],
              events: [],
              assumptions: [],
            },
            summary: 'Merged duplicate actor labels.',
            changes: ['Merged "US Government" into "United States Government".'],
            contradictions: [],
          },
        }),
      },
    })

    const result = await service.createInitialOntology('A geopolitical conflict.', {
      normalizeAndRepair: true,
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.ontology.nodes).toHaveLength(1)
      expect(result.normalizationSummary).toContain('Merged duplicate actor labels')
      expect(result.normalizationSummary).toContain('Changes:')
    }
  })
})
