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
      'Set targetOutcomes to the ontology node labels that are the most direct semantic match for what the user is asking about.',
      'Prefer the closest direct target in the ontology, not an indirect downstream consequence, unless the user explicitly asks about consequences or effects.',
      'Use focusNodeIds only when there are obvious directly relevant nodes.',
      '',
      question.trim(),
    ].join('\n'),
  }
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(' ')
    .map((token) => {
      if (token.length > 4 && token.endsWith('ies')) {
        return `${token.slice(0, -3)}y`
      }

      if (token.length > 3 && token.endsWith('s')) {
        return token.slice(0, -1)
      }

      return token
    })
    .filter((token) => token.length > 1)
}

function scoreDirectMatch(question: string, label: string) {
  const questionTokens = new Set(tokenize(question))
  const labelTokens = tokenize(label)

  if (labelTokens.length === 0) {
    return 0
  }

  let score = 0
  for (const token of labelTokens) {
    if (questionTokens.has(token)) {
      score += token.length > 5 ? 2 : 1
    }
  }

  const normalizedQuestion = normalizeText(question)
  const normalizedLabel = normalizeText(label)
  if (normalizedQuestion.includes(normalizedLabel)) {
    score += 1
  }

  return score
}

function alignTargetsToOntology(query: StructuredQuery, ontology: Ontology): StructuredQuery {
  if (ontology.nodes.length === 0 || query.targetOutcomes.length === 0) {
    return query
  }

  const nodeLabels = ontology.nodes.map((node) => node.label)
  const directMatches = nodeLabels
    .map((label) => ({ label, score: scoreDirectMatch(query.question, label) }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score)

  if (directMatches.length === 0) {
    return query
  }

  const currentBestScore = Math.max(
    ...query.targetOutcomes.map((label) => scoreDirectMatch(query.question, label)),
  )
  const bestDirectMatch = directMatches[0]

  if (!bestDirectMatch || bestDirectMatch.score <= currentBestScore) {
    return query
  }

  return {
    ...query,
    targetOutcomes: [bestDirectMatch.label],
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
      const repaired = await this.dependencies.openRouter.callLight({
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

      if (!repaired.ok) {
        return repaired
      }

      return {
        ...repaired,
        data: alignTargetsToOntology(repaired.data, ontology),
      }
    }

    if (!result.ok) {
      return result
    }

    return {
      ...result,
      data: alignTargetsToOntology(result.data, ontology),
    }
  }

  async explainResult(query: StructuredQuery, result: QueryResult) {
    return this.dependencies.openRouter.callLight({
      prompt: buildExplanationPrompt(query, result),
      temperature: 0.2,
    })
  }
}

export const queryFlowService = new QueryFlowService()
