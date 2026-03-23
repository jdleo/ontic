import type { Ontology, OntologyEdgeType, QueryResult, StructuredQuery } from '../types'

export type SimulationRequest = {
  ontology: Ontology
  query: StructuredQuery
  rolloutCount?: number
}

export type SimulationResponse = {
  result: QueryResult
  rolloutCount: number
}

type RolloutState = {
  nodeScores: Record<string, number>
}

const DEFAULT_ROLLOUT_COUNT = 500

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

function hashNoise(seed: string) {
  let hash = 0

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(index)
    hash |= 0
  }

  return ((Math.sin(hash) + 1) / 2) * 2 - 1
}

function seedNodeScore(nodeId: string, rolloutIndex: number, observed?: boolean, confidence?: number) {
  if (observed) {
    return clamp(confidence ?? 0.85)
  }

  const base = confidence ?? 0.5
  const jitter = hashNoise(`${nodeId}:${rolloutIndex}`) * 0.18
  return clamp(base + jitter)
}

function rankNodesByDrivers(ontology: Ontology, scores: Record<string, number>) {
  return ontology.nodes
    .map((node) => {
      const outgoing = ontology.edges.filter((edge) => edge.source === node.id)
      const influence = outgoing.reduce((total, edge) => {
        const weight = edge.data.weight ?? 0.5
        const confidence = edge.data.confidence ?? 0.5
        return total + weight * confidence
      }, 0)

      return {
        label: node.label,
        impact: Number((scores[node.id] * (1 + influence)).toFixed(3)),
      }
    })
    .sort((left, right) => right.impact - left.impact)
    .slice(0, 5)
}

function edgeSign(type: OntologyEdgeType, polarity: 'positive' | 'negative' | 'mixed' | undefined) {
  if (polarity === 'negative') {
    return -1
  }

  if (polarity === 'mixed') {
    return 0.35
  }

  if (polarity === 'positive') {
    return 1
  }

  switch (type) {
    case 'constrains':
      return -1
    case 'competes_with':
      return -0.7
    case 'observes':
      return 0
    case 'depends_on':
      return 0.2
    case 'influences':
    case 'supports':
    case 'causes':
    default:
      return 1
  }
}

function applyBoundedDelta(targetScore: number, delta: number) {
  if (delta > 0) {
    return clamp(targetScore + (1 - targetScore) * delta)
  }

  if (delta < 0) {
    return clamp(targetScore + targetScore * delta)
  }

  return targetScore
}

function rollOutOnce(ontology: Ontology, rolloutIndex: number): RolloutState {
  const nodeScores: Record<string, number> = {}

  for (const node of ontology.nodes) {
    nodeScores[node.id] = seedNodeScore(
      node.id,
      rolloutIndex,
      node.data.observed,
      node.data.confidence,
    )
  }

  for (let pass = 0; pass < 3; pass += 1) {
    for (const edge of ontology.edges) {
      const sourceScore = nodeScores[edge.source] ?? 0.5
      const targetScore = nodeScores[edge.target] ?? 0.5
      const weight = edge.data.weight ?? 0.5
      const confidence = edge.data.confidence ?? 0.5
      const signed = edgeSign(edge.type, edge.data.polarity)
      const delta = sourceScore * weight * confidence * 0.3 * signed

      nodeScores[edge.target] = applyBoundedDelta(targetScore, delta)
    }
  }

  return { nodeScores }
}

export function runSimulation({
  ontology,
  query,
  rolloutCount = DEFAULT_ROLLOUT_COUNT,
}: SimulationRequest): SimulationResponse {
  const safeRolloutCount = Math.min(1000, Math.max(300, Math.round(rolloutCount)))
  const targetLabels = query.targetOutcomes.length
    ? query.targetOutcomes
    : ontology.nodes.filter((node) => node.type === 'outcome').map((node) => node.label)
  const matchingTargets = ontology.nodes.filter((node) => targetLabels.includes(node.label))
  const targetNodes = matchingTargets.length
    ? matchingTargets
    : ontology.nodes.filter((node) => node.type === 'outcome').slice(0, 3)

  const totals = new Map<string, number>(targetNodes.map((node) => [node.label, 0]))
  const confidenceSamples: number[] = []
  let aggregateScores: Record<string, number> = {}

  for (let index = 0; index < safeRolloutCount; index += 1) {
    const rollout = rollOutOnce(ontology, index)

    for (const node of targetNodes) {
      totals.set(node.label, (totals.get(node.label) ?? 0) + (rollout.nodeScores[node.id] ?? 0))
    }

    for (const [nodeId, score] of Object.entries(rollout.nodeScores)) {
      aggregateScores[nodeId] = (aggregateScores[nodeId] ?? 0) + score
    }

    const observedRatio =
      ontology.nodes.filter((node) => node.data.observed).length / Math.max(ontology.nodes.length, 1)
    confidenceSamples.push(clamp(0.45 + observedRatio * 0.35 + ontology.edges.length * 0.01))
  }

  const rawOutcomes = [...totals.entries()].map(([label, total]) => ({
    label,
    total,
  }))

  aggregateScores = Object.fromEntries(
    Object.entries(aggregateScores).map(([nodeId, total]) => [nodeId, total / safeRolloutCount]),
  )

  const outcomes = targetNodes.length === 1
    ? (() => {
        const target = targetNodes[0]
        const targetProbability = Number(((aggregateScores[target.id] ?? 0) || 0).toFixed(4))
        const negativeLabel = `Not ${target.label.charAt(0).toLowerCase()}${target.label.slice(1)}`

        return [
          {
            label: target.label,
            probability: targetProbability,
          },
          {
            label: negativeLabel,
            probability: Number((1 - targetProbability).toFixed(4)),
          },
        ]
      })()
    : (() => {
        const grandTotal = rawOutcomes.reduce((sum, item) => sum + item.total, 0) || 1

        return rawOutcomes.map(({ label, total }) => ({
          label,
          probability: Number((total / grandTotal).toFixed(4)),
        }))
      })()

  return {
    rolloutCount: safeRolloutCount,
    result: {
      outcomes,
      keyDrivers: rankNodesByDrivers(ontology, aggregateScores),
      modelConfidence: Number(
        (
          confidenceSamples.reduce((sum, value) => sum + value, 0) / confidenceSamples.length
        ).toFixed(3),
      ),
      notes: [
        `Computed from ${safeRolloutCount} worker rollouts.`,
        query.timeframe ? `Timeframe: ${query.timeframe}.` : 'No explicit timeframe provided.',
      ],
    },
  }
}
