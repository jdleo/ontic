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
      cause: {
        code: 'schema_validation_error',
        message: 'bad schema',
      },
    })
  })
})
