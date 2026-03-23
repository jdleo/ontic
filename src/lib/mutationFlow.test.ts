import { describe, expect, it, vi } from 'vitest'
import { MutationFlowService } from './mutationFlow'

describe('MutationFlowService', () => {
  it('tells the model the exact mutation patch shapes and forbidden shortcut keys', async () => {
    const callMedium = vi.fn().mockResolvedValue({
      ok: true,
      model: 'medium-model',
      text: '{"patchSummary":"No change"}',
      data: {
        patchSummary: 'No change',
      },
    })

    const service = new MutationFlowService({
      openRouter: { callMedium },
    })

    await service.parseMutation('Shop B publicly commits not to match price cuts.', {
      nodes: [],
      edges: [],
      variables: [],
      actors: [],
      events: [],
      assumptions: [],
    })

    const prompt = callMedium.mock.calls[0]?.[0]?.prompt
    expect(prompt?.user).toContain('Use exact schema shapes only. Do not invent new key names.')
    expect(prompt?.user).toContain('addEdges entries must be full ontology edges: { id, source, target, type, data }. Do not use from/to/label/description.')
    expect(prompt?.user).toContain('Do not use unsupported node types like intervention.')
    expect(prompt?.user).toContain('Do not use unsupported edge types like blocks, overrides, issues, or suspended.')
    expect(prompt?.user).toContain('addAssumptions entries must be { id, label, confidence? }. Do not use description in place of label.')
    expect(prompt?.user).toContain('addEvents entries must be { id, label, description?, timestamp, effects? }, and timestamp must be integer unix milliseconds.')
  })

  it('logs schema validation details when mutation parsing fails', async () => {
    const callMedium = vi.fn().mockResolvedValueOnce({
      ok: false,
      error: {
        code: 'schema_validation_error',
        message: 'OpenRouter JSON response failed schema validation.',
        rawText: '{"updateNodes":"bad"}',
        issues: [{ path: ['updateNodes'], message: 'Expected array, received string' }],
      },
    }).mockResolvedValueOnce({
      ok: false,
      error: {
        code: 'schema_validation_error',
        message: 'OpenRouter JSON response failed schema validation.',
        rawText: '{"addEdges":"still bad"}',
        issues: [{ path: ['addEdges'], message: 'Expected array, received string' }],
      },
    })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const service = new MutationFlowService({
      openRouter: { callMedium },
    })

    const result = await service.parseMutation('Reduce tariffs.', {
      nodes: [],
      edges: [],
      variables: [],
      actors: [],
      events: [],
      assumptions: [],
    })

    expect(result.ok).toBe(false)
    expect(callMedium).toHaveBeenCalledTimes(2)
    expect(consoleError).toHaveBeenCalledTimes(2)
    expect(consoleError.mock.calls[0]?.[0]).toBe('[ontic] mutation schema validation failed')
    expect(consoleError.mock.calls[1]?.[0]).toBe('[ontic] mutation schema validation failed')

    consoleError.mockRestore()
  })
})
