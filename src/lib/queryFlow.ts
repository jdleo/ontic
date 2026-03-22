import { type ZodIssue } from 'zod'
import { structuredQuerySchema } from '../types'
import type { Ontology, QueryResult, StructuredQuery } from '../types'
import { openRouterClient } from './openRouter'

export type QueryFlowDependencies = {
  openRouter: Pick<typeof openRouterClient, 'callLight'>
}

function buildParsePrompt(question: string, ontology: Ontology) {
  return {
    system:
      'You convert natural-language questions about an ontology into structured query JSON. Return only JSON.',
    user: [
      'Convert this question into structured query JSON with keys: question, timeframe, targetOutcomes, focusNodeIds, comparisonMode.',
      `Available node labels: ${ontology.nodes.map((node) => `${node.label} (${node.id})`).join(', ')}`,
      'Set targetOutcomes to the most relevant outcome labels or likely result labels if no explicit outcome node exists.',
      'Use focusNodeIds only when there are obvious directly relevant nodes.',
      '',
      question.trim(),
    ].join('\n'),
  }
}

function buildExplanationPrompt(query: StructuredQuery, result: QueryResult) {
  return {
    system: 'You explain simulation results concisely for a decision-support tool.',
    user: [
      'Explain the query result in 2 to 4 short sentences.',
      `Question: ${query.question}`,
      `Outcomes: ${result.outcomes.map((item) => `${item.label}=${Math.round(item.probability * 100)}%`).join(', ')}`,
      `Key drivers: ${result.keyDrivers.map((item) => `${item.label} (${item.impact})`).join(', ')}`,
      `Model confidence: ${Math.round(result.modelConfidence * 100)}%`,
    ].join('\n'),
  }
}

function summarizeIssues(issues: ZodIssue[] | undefined) {
  if (!issues?.length) {
    return 'Validation failed for the previous structured query.'
  }

  return issues
    .slice(0, 10)
    .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
    .join('\n')
}

export class QueryFlowService {
  private readonly dependencies: QueryFlowDependencies

  constructor(dependencies: Partial<QueryFlowDependencies> = {}) {
    this.dependencies = {
      openRouter: dependencies.openRouter ?? openRouterClient,
    }
  }

  async parseQuestion(question: string, ontology: Ontology) {
    const result = await this.dependencies.openRouter.callLight({
      prompt: buildParsePrompt(question, ontology),
      temperature: 0.1,
      responseSchema: structuredQuerySchema,
    })

    if (!result.ok && result.error.code === 'schema_validation_error') {
      return this.dependencies.openRouter.callLight({
        messages: [
          {
            role: 'system',
            content: 'You repair structured query JSON. Return only corrected JSON that matches the requested schema.',
          },
          {
            role: 'user',
            content: [
              'The previous structured query JSON failed validation.',
              'Fix it to exactly match keys: question, timeframe, targetOutcomes, focusNodeIds, comparisonMode.',
              'comparisonMode, if present, must be one of: single, ranked, binary.',
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
        responseSchema: structuredQuerySchema,
      })
    }

    return result
  }

  async explainResult(query: StructuredQuery, result: QueryResult) {
    return this.dependencies.openRouter.callLight({
      prompt: buildExplanationPrompt(query, result),
      temperature: 0.2,
    })
  }
}

export const queryFlowService = new QueryFlowService()
