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
      '',
      input.instruction.trim(),
    ].join('\n'),
  }
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
      return this.dependencies.openRouter.callMedium({
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
              '',
              'Previous JSON:',
              result.error.rawText ?? '',
            ].join('\n'),
          },
        ],
        temperature: 0,
        responseSchema: mutationPatchSchema,
      })
    }

    return result
  }
}

export const mutationFlowService = new MutationFlowService()
