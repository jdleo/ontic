import dagre from '@dagrejs/dagre'
import { z, type ZodIssue } from 'zod'
import { ontologySchema } from '../types'
import type { GraphPreferences, Ontology } from '../types'
import { openRouterClient, type OpenRouterResult } from './openRouter'

const draftOntologySchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string().min(1),
      type: z.enum([
        'actor',
        'institution',
        'resource',
        'event',
        'belief',
        'constraint',
        'objective',
        'outcome',
      ]),
      label: z.string().min(1),
      position: z
        .object({
          x: z.number().finite(),
          y: z.number().finite(),
        })
        .optional(),
      data: z.object({
        description: z.string().min(1).optional(),
        attributes: z.record(z.string(), z.unknown()).optional(),
        confidence: z.number().finite().min(0).max(1).optional(),
        observed: z.boolean().optional(),
      }),
    }),
  ),
  edges: z.array(
    z.object({
      id: z.string().min(1),
      source: z.string().min(1),
      target: z.string().min(1),
      type: z.enum([
        'influences',
        'competes_with',
        'supports',
        'constrains',
        'depends_on',
        'observes',
        'causes',
      ]),
      data: z.object({
        weight: z.number().finite().optional(),
        polarity: z.enum(['positive', 'negative', 'mixed']).optional(),
        confidence: z.number().finite().min(0).max(1).optional(),
      }),
    }),
  ),
  variables: z.array(ontologySchema.shape.variables.element).default([]),
  actors: z.array(ontologySchema.shape.actors.element).default([]),
  events: z.array(ontologySchema.shape.events.element).default([]),
  assumptions: z.array(ontologySchema.shape.assumptions.element).default([]),
})

type DraftOntology = z.infer<typeof draftOntologySchema>

export type WorldCreationDependencies = {
  openRouter: Pick<typeof openRouterClient, 'callHeavy'>
}

export type CreateInitialOntologyOptions = {
  graphPreferences?: GraphPreferences
}

export type WorldCreationResult =
  | { ok: true; ontology: Ontology; rawText: string; model: string }
  | { ok: false; message: string; debugMessage?: string; cause: unknown }

function createFallbackPosition(index: number) {
  const columns = 3
  const column = index % columns
  const row = Math.floor(index / columns)

  return {
    x: 120 + column * 260,
    y: 120 + row * 190,
  }
}

const DAGRE_NODE_WIDTH = 220
const DAGRE_NODE_HEIGHT = 120

function layoutNodesByFlow(draft: DraftOntology) {
  const graph = new dagre.graphlib.Graph()

  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({
    rankdir: 'LR',
    nodesep: 60,
    ranksep: 140,
    marginx: 40,
    marginy: 40,
    ranker: 'network-simplex',
  })

  for (const node of draft.nodes) {
    graph.setNode(node.id, {
      width: DAGRE_NODE_WIDTH,
      height: DAGRE_NODE_HEIGHT,
    })
  }

  for (const edge of draft.edges) {
    graph.setEdge(edge.source, edge.target)
  }

  dagre.layout(graph)

  return draft.nodes.map((node, index) => {
    const layout = graph.node(node.id)

    if (!layout) {
      return {
        ...node,
        position: createFallbackPosition(index),
      }
    }

    return {
      ...node,
      position: {
        x: layout.x - DAGRE_NODE_WIDTH / 2,
        y: layout.y - DAGRE_NODE_HEIGHT / 2,
      },
    }
  })
}

function normalizeOntology(
  draft: DraftOntology,
  options: CreateInitialOntologyOptions = {},
): Ontology {
  const avoidNodeOverlap = options.graphPreferences?.avoidNodeOverlap ?? true

  return ontologySchema.parse({
    ...draft,
    nodes: avoidNodeOverlap
      ? layoutNodesByFlow(draft)
      : draft.nodes.map((node, index) => ({
          ...node,
          position: node.position ?? createFallbackPosition(index),
        })),
  })
}

function buildPrompt(scenario: string) {
  return {
    system:
      'You extract an ontology from a described situation. Return only JSON. Prefer a compact, concrete graph with credible actors, resources, events, beliefs, constraints, objectives, and outcomes when they are materially present. Every edge must reference existing node ids.',
    user: [
      'Convert the following scenario into ontology JSON.',
      'Return an object with keys: nodes, edges, variables, actors, events, assumptions.',
      'Allowed node types: actor, institution, resource, event, belief, constraint, objective, outcome.',
      'Allowed edge types: influences, competes_with, supports, constrains, depends_on, observes, causes.',
      'Node data may contain only: description, attributes, confidence, observed.',
      'Edge data may contain only: weight, polarity, confidence. Allowed polarity values: positive, negative, mixed.',
      'Each node must include: id, type, label, optional position, and data.',
      'Each edge must include: id, source, target, type, and data.',
      'Use 3 to 12 nodes unless the scenario clearly requires more.',
      'Keep ids stable, lowercase, and hyphenated.',
      'Do not use custom edge types like action or causal.',
      '',
      scenario.trim(),
    ].join('\n'),
  }
}

function summarizeIssues(issues: ZodIssue[] | undefined) {
  if (!issues?.length) {
    return 'Validation failed for the previous ontology output.'
  }

  return issues
    .slice(0, 12)
    .map((issue) => {
      const path = issue.path.length ? issue.path.join('.') : 'root'
      return `${path}: ${issue.message}`
    })
    .join('\n')
}

function formatCreationError(result: OpenRouterResult<DraftOntology>): string {
  if (result.ok) {
    return 'The parser returned invalid ontology output.'
  }

  switch (result.error.code) {
    case 'missing_api_key':
      return 'OpenRouter is not configured. Add an API key before creating a world.'
    case 'network_error':
      return 'The parser request failed before reaching OpenRouter. Check your connection and try again.'
    case 'api_error':
      return `OpenRouter rejected the parser request${result.error.status ? ` (status ${result.error.status})` : ''}.`
    case 'empty_response':
      return 'The parser returned an empty response.'
    case 'json_parse_error':
      return 'The parser returned malformed JSON and could not be repaired.'
    case 'schema_validation_error':
      return 'The parser returned JSON, but it failed ontology validation. No world was saved.'
    default:
      return 'The parser failed to produce a valid ontology.'
  }
}

function formatDebugMessage(cause: unknown): string | undefined {
  if (cause instanceof Error) {
    return cause.message
  }

  if (typeof cause === 'string' && cause.trim().length > 0) {
    return cause
  }

  try {
    return JSON.stringify(cause)
  } catch {
    return undefined
  }
}

function logWorldCreationFailure(message: string, cause: unknown) {
  console.error('[ontic] world creation failed', {
    message,
    cause,
  })
}

export class WorldCreationService {
  private readonly dependencies: WorldCreationDependencies

  constructor(dependencies: Partial<WorldCreationDependencies> = {}) {
    this.dependencies = {
      openRouter: dependencies.openRouter ?? openRouterClient,
    }
  }

  async createInitialOntology(
    scenario: string,
    options: CreateInitialOntologyOptions = {},
  ): Promise<WorldCreationResult> {
    const result = await this.dependencies.openRouter.callHeavy({
      prompt: buildPrompt(scenario),
      temperature: 0.2,
      responseSchema: draftOntologySchema,
    })

    const repaired = !result.ok && result.error.code === 'schema_validation_error'
      ? await this.dependencies.openRouter.callHeavy({
          messages: [
            {
              role: 'system',
              content:
                'You repair ontology JSON to exactly match the requested schema. Return only corrected JSON.',
            },
            {
              role: 'user',
              content: [
                'The previous ontology JSON failed validation.',
                'Allowed node types: actor, institution, resource, event, belief, constraint, objective, outcome.',
                'Allowed edge types: influences, competes_with, supports, constrains, depends_on, observes, causes.',
                'Node data may contain only: description, attributes, confidence, observed.',
                'Edge data may contain only: weight, polarity, confidence. Allowed polarity values: positive, negative, mixed.',
                'Fix the JSON below so it validates. Keep the same scenario meaning, but remove unsupported fields and map unsupported edge types to the nearest allowed type.',
                '',
                'Validation issues:',
                summarizeIssues(result.error.issues),
                '',
                'Previous JSON:',
                result.error.rawText ?? '',
              ].join('\n'),
            },
          ],
          temperature: 0,
          responseSchema: draftOntologySchema,
        })
      : null

    const resolved = repaired?.ok ? repaired : result

    if (!resolved.ok) {
      logWorldCreationFailure(formatCreationError(resolved), resolved.error)
      return {
        ok: false,
        message: formatCreationError(resolved),
        debugMessage: formatDebugMessage(resolved.error.cause ?? resolved.error.rawText ?? resolved.error),
        cause: resolved.error,
      }
    }

    try {
      return {
        ok: true,
        ontology: normalizeOntology(resolved.data, options),
        rawText: resolved.text,
        model: resolved.model,
      }
    } catch (cause) {
      logWorldCreationFailure(
        'The parser output could not be normalized into a valid ontology. No world was saved.',
        cause,
      )
      return {
        ok: false,
        message: 'The parser output could not be normalized into a valid ontology. No world was saved.',
        debugMessage: formatDebugMessage(cause),
        cause,
      }
    }
  }
}

export const worldCreationService = new WorldCreationService()
