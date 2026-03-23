import { mutationPatchSchema } from '../types'
import type { Ontology } from '../types'
import { openRouterClient } from './openRouter'

export type MutationFlowDependencies = {
  openRouter: Pick<typeof openRouterClient, 'callMedium'>
}

function buildMutationPrompt(input: {
  instruction: string
  ontology: Ontology
}) {
  return {
    system:
      'You convert natural-language world interventions into ontology mutation patches. Return only JSON.',
    user: [
      'Convert this intervention into a MutationPatch JSON object.',
      'Allowed keys: addNodes, updateNodes, addEdges, updateEdges, addVariables, updateVariables, addEvents, addAssumptions, patchSummary.',
      `Existing nodes: ${input.ontology.nodes.map((node) => `${node.label} (${node.id})`).join(', ')}`,
      `Existing edges: ${input.ontology.edges.map((edge) => `${edge.id}:${edge.source}->${edge.target}`).join(', ')}`,
      'Prefer updating existing entities over creating duplicates when possible.',
      'Use exact schema shapes only. Do not invent new key names.',
      'addNodes entries must be full ontology nodes: { id, type, label, position?, data }.',
      'Node descriptions belong inside data.description, not at the top level.',
      'updateNodes entries must be { id, changes }, where changes may include label, description, attributes, confidence, observed.',
      'addEdges entries must be full ontology edges: { id, source, target, type, data }. Do not use from/to/label/description.',
      'updateEdges entries must be { id, changes }, where changes may include type, weight, polarity, confidence.',
      'addAssumptions entries must be { id, label, confidence? }. Do not use description in place of label.',
      'addEvents entries must be { id, label, description?, timestamp, effects? }, and timestamp must be integer unix milliseconds.',
      'Event effects must be objects like { targetType, targetId, delta? , set? }, not plain strings.',
      'Do not use unsupported node types like intervention.',
      'Do not use unsupported edge types like blocks, overrides, issues, or suspended.',
      'If the intervention changes existing behavior, prefer updateNodes/updateEdges over inventing semantic labels on edges.',
      'If unsure, return only patchSummary and the minimal valid updates.',
      'Example addNode: {"id":"commitment-1","type":"belief","label":"Shop B no-match commitment","data":{"description":"Public commitment not to match prices for one month","confidence":0.8}}',
      'Example addEdge: {"id":"edge-1","source":"commitment-1","target":"price-match-b","type":"constrains","data":{"polarity":"negative","weight":0.9,"confidence":0.85}}',
      'Example updateEdge: {"id":"edge-b-matches","changes":{"confidence":0.2,"weight":0.2,"polarity":"negative"}}',
      'Example assumption: {"id":"assumption-1","label":"The commitment is credible","confidence":0.8}',
      'Example event: {"id":"event-1","label":"Commitment expires","timestamp":1700000000000,"description":"The one-month commitment ends."}',
      '',
      input.instruction.trim(),
    ].join('\n'),
  }
}

function summarizeIssues(issues: Array<{ path?: Array<string | number>; message: string }> | undefined) {
  if (!issues?.length) {
    return 'Validation failed for the previous mutation patch.'
  }

  return issues
    .slice(0, 12)
    .map((issue) => `${issue.path?.join('.') || 'root'}: ${issue.message}`)
    .join('\n')
}

function logMutationSchemaFailure(stage: 'parse' | 'repair', instruction: string, rawText: string | undefined, issues: unknown) {
  console.error('[ontic] mutation schema validation failed', {
    stage,
    instruction,
    rawText,
    issues,
  })
}

export class MutationFlowService {
  private readonly dependencies: MutationFlowDependencies

  constructor(dependencies: Partial<MutationFlowDependencies> = {}) {
    this.dependencies = {
      openRouter: dependencies.openRouter ?? openRouterClient,
    }
  }

  async parseMutation(instruction: string, ontology: Ontology) {
    const result = await this.dependencies.openRouter.callMedium({
      prompt: buildMutationPrompt({ instruction, ontology }),
      temperature: 0.15,
      responseSchema: mutationPatchSchema,
    })

    if (!result.ok && result.error.code === 'schema_validation_error') {
      logMutationSchemaFailure('parse', instruction, result.error.rawText, result.error.issues)

      const repaired = await this.dependencies.openRouter.callMedium({
        messages: [
          {
            role: 'system',
            content: 'You repair mutation patch JSON. Return only corrected JSON.',
          },
          {
            role: 'user',
            content: [
              'The previous mutation patch failed validation.',
              'Fix it to match the MutationPatch schema exactly.',
              'Allowed keys: addNodes, updateNodes, addEdges, updateEdges, addVariables, updateVariables, addEvents, addAssumptions, patchSummary.',
              'Use exact schema shapes only. Do not invent new key names.',
              'addNodes entries must be full ontology nodes: { id, type, label, position?, data }.',
              'Node descriptions belong inside data.description, not at the top level.',
              'updateNodes entries must be { id, changes }.',
              'addEdges entries must be full ontology edges: { id, source, target, type, data }. Do not use from/to/label/description.',
              'updateEdges entries must be { id, changes }, where changes may include type, weight, polarity, confidence.',
              'addAssumptions entries must be { id, label, confidence? }.',
              'addEvents entries must be { id, label, description?, timestamp, effects? }, and timestamp must be integer unix milliseconds.',
              'Event effects must be objects, not plain strings.',
              'Do not use unsupported node types like intervention or unsupported edge types like blocks, overrides, or issues.',
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
        responseSchema: mutationPatchSchema,
      })

      if (!repaired.ok && repaired.error.code === 'schema_validation_error') {
        logMutationSchemaFailure('repair', instruction, repaired.error.rawText, repaired.error.issues)
      }

      return repaired
    }

    return result
  }
}

export const mutationFlowService = new MutationFlowService()
