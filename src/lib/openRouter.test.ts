import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { OpenRouterClient } from './openRouter'
import { OPENROUTER_API_KEY_STORAGE_KEY } from '../store/worldStore'
import type { ModelTierConfig } from '../types'

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial))

  return {
    getItem(key: string) {
      return values.get(key) ?? null
    },
  }
}

function createResponse({
  ok = true,
  status = 200,
  json,
  text,
}: {
  ok?: boolean
  status?: number
  json?: unknown
  text?: string
}) {
  return {
    ok,
    status,
    async json() {
      return json
    },
    async text() {
      return text ?? ''
    },
  } as Response
}

describe('OpenRouterClient', () => {
  it('returns a missing key error before making a request', async () => {
    const fetchMock = vi.fn()
    const client = new OpenRouterClient({
      fetch: fetchMock as typeof fetch,
      persistence: {
        getSetting: vi.fn(),
      },
      storage: createStorage(),
    })

    const result = await client.callLight({
      prompt: {
        user: 'Ping',
      },
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('missing_api_key')
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uses the configured tier model and returns plain text responses', async () => {
    const config: ModelTierConfig = {
      low: 'low-model',
      medium: 'medium-model',
      high: 'high-model',
    }

    const fetchMock = vi.fn().mockResolvedValue(
      createResponse({
        json: {
          choices: [{ message: { content: 'plain text output' } }],
        },
      }),
    )

    const client = new OpenRouterClient({
      fetch: fetchMock as typeof fetch,
      persistence: {
        getSetting: vi.fn().mockResolvedValue({ value: config }),
      },
      storage: createStorage({
        [OPENROUTER_API_KEY_STORAGE_KEY]: 'sk-or-v1-test',
      }),
    })

    const result = await client.callMedium({
      prompt: {
        system: 'You are concise.',
        user: 'Summarize this.',
      },
    })

    expect(result).toEqual({
      ok: true,
      data: 'plain text output',
      model: 'medium-model',
      text: 'plain text output',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(String(init.body)) as { model: string; messages: Array<{ role: string; content: string }> }
    expect(body.model).toBe('medium-model')
    expect(body.messages).toEqual([
      { role: 'system', content: 'You are concise.' },
      { role: 'user', content: 'Summarize this.' },
    ])
  })

  it('retries once on malformed JSON and returns validated data from the second response', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createResponse({
          json: {
            choices: [{ message: { content: '{"answer": ' } }],
          },
        }),
      )
      .mockResolvedValueOnce(
        createResponse({
          json: {
            choices: [{ message: { content: '{"answer":"fixed"}' } }],
          },
        }),
      )

    const client = new OpenRouterClient({
      fetch: fetchMock as typeof fetch,
      persistence: {
        getSetting: vi.fn().mockResolvedValue(undefined),
      },
      storage: createStorage({
        [OPENROUTER_API_KEY_STORAGE_KEY]: 'sk-or-v1-test',
      }),
    })

    const result = await client.callHeavy({
      prompt: {
        user: 'Return {"answer":"fixed"}.',
      },
      responseSchema: z.object({
        answer: z.string(),
      }),
    })

    expect(result).toEqual({
      ok: true,
      data: { answer: 'fixed' },
      model: 'anthropic/claude-opus-4.6',
      text: '{"answer":"fixed"}',
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [, secondInit] = fetchMock.mock.calls[1]
    const secondBody = JSON.parse(String(secondInit.body)) as {
      response_format?: { type: string }
      messages: Array<{ role: string; content: string }>
    }
    expect(secondBody.response_format).toEqual({ type: 'json_object' })
    expect(secondBody.messages.at(-1)?.content).toMatch(/not valid JSON/)
  })

  it('returns a structured schema validation error without retrying', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createResponse({
        json: {
          choices: [{ message: { content: '{"answer":42}' } }],
        },
      }),
    )

    const client = new OpenRouterClient({
      fetch: fetchMock as typeof fetch,
      persistence: {
        getSetting: vi.fn().mockResolvedValue(undefined),
      },
      storage: createStorage({
        [OPENROUTER_API_KEY_STORAGE_KEY]: 'sk-or-v1-test',
      }),
    })

    const result = await client.callLight({
      prompt: {
        user: 'Return JSON.',
      },
      responseSchema: z.object({
        answer: z.string(),
      }),
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('schema_validation_error')
      expect(result.error.rawText).toBe('{"answer":42}')
    }
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
