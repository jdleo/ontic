import { ZodError, type ZodType } from 'zod'
import { MODEL_TIER_CONFIG_KEY, persistence } from '../db/repository'
import type { ModelTierConfig } from '../types'
import { DEFAULT_MODEL_TIER_CONFIG, OPENROUTER_API_KEY_STORAGE_KEY } from '../store/worldStore'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

export type ModelTier = 'low' | 'medium' | 'high'

export type OpenRouterRole = 'system' | 'user' | 'assistant'

export type OpenRouterMessage = {
  role: OpenRouterRole
  content: string
}

export type OpenRouterPrompt = {
  system?: string
  user: string
}

export type OpenRouterStructuredErrorCode =
  | 'missing_api_key'
  | 'network_error'
  | 'api_error'
  | 'empty_response'
  | 'json_parse_error'
  | 'schema_validation_error'

export type OpenRouterStructuredError = {
  code: OpenRouterStructuredErrorCode
  message: string
  status?: number
  cause?: unknown
  issues?: ZodError['issues']
  rawText?: string
}

export type OpenRouterSuccess<TResult> = {
  ok: true
  data: TResult
  model: string
  text: string
}

export type OpenRouterFailure = {
  ok: false
  error: OpenRouterStructuredError
}

export type OpenRouterResult<TResult> = OpenRouterSuccess<TResult> | OpenRouterFailure

export type OpenRouterCallOptions<TResult> = {
  prompt?: OpenRouterPrompt
  messages?: OpenRouterMessage[]
  temperature?: number
  responseSchema?: ZodType<TResult>
}

export type OpenRouterClientDependencies = {
  fetch: typeof fetch
  persistence: Pick<typeof persistence, 'getSetting'>
  storage: Pick<Storage, 'getItem'>
}

function getBrowserStorage(): Pick<Storage, 'getItem'> {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage
  }

  return {
    getItem() {
      return null
    },
  }
}

function buildMessages(
  options: OpenRouterCallOptions<unknown>,
  retryPrompt?: string,
): OpenRouterMessage[] {
  const promptMessages = options.prompt
    ? [
        ...(options.prompt.system
          ? [{ role: 'system' as const, content: options.prompt.system }]
          : []),
        { role: 'user' as const, content: options.prompt.user },
      ]
    : []

  const baseMessages = options.messages?.length ? options.messages : promptMessages

  if (!baseMessages.length) {
    throw new Error('OpenRouter calls require either prompt or messages.')
  }

  return retryPrompt
    ? [...baseMessages, { role: 'user', content: retryPrompt }]
    : baseMessages
}

function extractTextContent(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part
        }

        if (
          part &&
          typeof part === 'object' &&
          'type' in part &&
          part.type === 'text' &&
          'text' in part &&
          typeof part.text === 'string'
        ) {
          return part.text
        }

        return ''
      })
      .join('')
      .trim()
  }

  return ''
}

function parseJson<TResult>(
  text: string,
  schema: ZodType<TResult>,
): OpenRouterResult<TResult> {
  try {
    const parsed = JSON.parse(text) as unknown
    const validated = schema.safeParse(parsed)

    if (!validated.success) {
      return {
        ok: false,
        error: {
          code: 'schema_validation_error',
          message: 'OpenRouter JSON response failed schema validation.',
          issues: validated.error.issues,
          rawText: text,
        },
      }
    }

    return {
      ok: true,
      data: validated.data,
      model: '',
      text,
    }
  } catch (cause) {
    return {
      ok: false,
      error: {
        code: 'json_parse_error',
        message: 'OpenRouter returned malformed JSON.',
        cause,
        rawText: text,
      },
    }
  }
}

export class OpenRouterClient {
  private readonly dependencies: OpenRouterClientDependencies

  constructor(
    dependencies: Partial<OpenRouterClientDependencies> = {},
  ) {
    this.dependencies = {
      fetch: dependencies.fetch ?? fetch,
      persistence: dependencies.persistence ?? persistence,
      storage: dependencies.storage ?? getBrowserStorage(),
    }
  }

  async callLight<TResult = string>(
    options: OpenRouterCallOptions<TResult>,
  ): Promise<OpenRouterResult<TResult>> {
    return this.call('low', options)
  }

  async callMedium<TResult = string>(
    options: OpenRouterCallOptions<TResult>,
  ): Promise<OpenRouterResult<TResult>> {
    return this.call('medium', options)
  }

  async callHeavy<TResult = string>(
    options: OpenRouterCallOptions<TResult>,
  ): Promise<OpenRouterResult<TResult>> {
    return this.call('high', options)
  }

  private async call<TResult>(
    tier: ModelTier,
    options: OpenRouterCallOptions<TResult>,
  ): Promise<OpenRouterResult<TResult>> {
    const apiKey = this.dependencies.storage.getItem(OPENROUTER_API_KEY_STORAGE_KEY)?.trim() ?? ''

    if (!apiKey) {
      return {
        ok: false,
        error: {
          code: 'missing_api_key',
          message: 'OpenRouter API key is not configured.',
        },
      }
    }

    const config = await this.resolveModelTierConfig()
    const model = config[tier]
    let retryPrompt: string | undefined

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await this.request({
        apiKey,
        model,
        temperature: options.temperature,
        messages: buildMessages(options, retryPrompt),
        jsonOnly: Boolean(options.responseSchema),
      })

      if (!response.ok) {
        return response
      }

      if (!options.responseSchema) {
        return {
          ok: true,
          data: response.text as TResult,
          model,
          text: response.text,
        }
      }

      const parsed = parseJson(response.text, options.responseSchema)

      if (parsed.ok) {
        return {
          ...parsed,
          model,
        }
      }

      if (attempt === 0 && parsed.error.code === 'json_parse_error') {
        retryPrompt = `Your previous reply was not valid JSON. Return only valid JSON matching the requested schema. Do not include markdown, commentary, or code fences.\n\nPrevious reply:\n${response.text}`
        continue
      }

      return parsed
    }

    return {
      ok: false,
      error: {
        code: 'json_parse_error',
        message: 'OpenRouter returned malformed JSON after retry.',
      },
    }
  }

  private async resolveModelTierConfig(): Promise<ModelTierConfig> {
    const stored = await this.dependencies.persistence.getSetting<ModelTierConfig>(MODEL_TIER_CONFIG_KEY)
    return stored?.value ?? DEFAULT_MODEL_TIER_CONFIG
  }

  private async request(input: {
    apiKey: string
    model: string
    temperature?: number
    messages: OpenRouterMessage[]
    jsonOnly: boolean
  }): Promise<OpenRouterResult<{ text: string }> | { ok: true; text: string }> {
    try {
      const response = await this.dependencies.fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: input.model,
          messages: input.messages,
          temperature: input.temperature,
          response_format: input.jsonOnly ? { type: 'json_object' } : undefined,
        }),
      })

      if (!response.ok) {
        return {
          ok: false,
          error: {
            code: 'api_error',
            message: `OpenRouter request failed with status ${response.status}.`,
            status: response.status,
            rawText: await response.text(),
          },
        }
      }

      const payload = await response.json() as {
        choices?: Array<{ message?: { content?: unknown } }>
      }

      const text = extractTextContent(payload.choices?.[0]?.message?.content)

      if (!text) {
        return {
          ok: false,
          error: {
            code: 'empty_response',
            message: 'OpenRouter returned an empty message.',
          },
        }
      }

      return { ok: true, text }
    } catch (cause) {
      return {
        ok: false,
        error: {
          code: 'network_error',
          message: 'OpenRouter request failed before a response was received.',
          cause,
        },
      }
    }
  }
}

export const openRouterClient = new OpenRouterClient()
