import type { QueryRecord, QueryResult, QueryResultRecord, WorldVersion } from '../types'

export type VersionDiff = {
  addedNodeIds: string[]
  changedNodeIds: string[]
  removedNodeIds: string[]
  addedEdgeIds: string[]
  changedEdgeIds: string[]
  removedEdgeIds: string[]
}

export type OutcomeDelta = {
  label: string
  currentProbability: number
  previousProbability: number
  delta: number
}

export function getParentVersion(
  versions: WorldVersion[],
  version: WorldVersion | null | undefined,
) {
  if (!version?.parentVersionId) {
    return null
  }

  return versions.find((candidate) => candidate.id === version.parentVersionId) ?? null
}

export function diffVersions(
  previousVersion: WorldVersion | null | undefined,
  currentVersion: WorldVersion | null | undefined,
): VersionDiff {
  if (!currentVersion) {
    return emptyVersionDiff()
  }

  if (!previousVersion) {
    return {
      addedNodeIds: currentVersion.ontology.nodes.map((node) => node.id),
      changedNodeIds: [],
      removedNodeIds: [],
      addedEdgeIds: currentVersion.ontology.edges.map((edge) => edge.id),
      changedEdgeIds: [],
      removedEdgeIds: [],
    }
  }

  const previousNodeMap = new Map(previousVersion.ontology.nodes.map((node) => [node.id, node]))
  const currentNodeMap = new Map(currentVersion.ontology.nodes.map((node) => [node.id, node]))
  const previousEdgeMap = new Map(previousVersion.ontology.edges.map((edge) => [edge.id, edge]))
  const currentEdgeMap = new Map(currentVersion.ontology.edges.map((edge) => [edge.id, edge]))

  return {
    addedNodeIds: currentVersion.ontology.nodes
      .filter((node) => !previousNodeMap.has(node.id))
      .map((node) => node.id),
    changedNodeIds: currentVersion.ontology.nodes
      .filter((node) => {
        const previousNode = previousNodeMap.get(node.id)
        return previousNode && JSON.stringify(previousNode) !== JSON.stringify(node)
      })
      .map((node) => node.id),
    removedNodeIds: previousVersion.ontology.nodes
      .filter((node) => !currentNodeMap.has(node.id))
      .map((node) => node.id),
    addedEdgeIds: currentVersion.ontology.edges
      .filter((edge) => !previousEdgeMap.has(edge.id))
      .map((edge) => edge.id),
    changedEdgeIds: currentVersion.ontology.edges
      .filter((edge) => {
        const previousEdge = previousEdgeMap.get(edge.id)
        return previousEdge && JSON.stringify(previousEdge) !== JSON.stringify(edge)
      })
      .map((edge) => edge.id),
    removedEdgeIds: previousVersion.ontology.edges
      .filter((edge) => !currentEdgeMap.has(edge.id))
      .map((edge) => edge.id),
  }
}

export function getLatestQueryResultForVersion(
  versionId: string,
  queries: QueryRecord[],
  queryResults: QueryResultRecord[],
) {
  const versionQueries = queries
    .filter((query) => query.versionId === versionId)
    .sort((left, right) => right.createdAt - left.createdAt)

  for (const query of versionQueries) {
    const result = queryResults
      .filter((candidate) => candidate.queryId === query.id)
      .sort((left, right) => right.createdAt - left.createdAt)[0]

    if (result) {
      return {
        query,
        result,
      }
    }
  }

  return null
}

export function getOutcomeDeltas(
  currentResult: QueryResult | null | undefined,
  previousResult: QueryResult | null | undefined,
) {
  if (!currentResult || !previousResult) {
    return []
  }

  const labels = new Set([
    ...currentResult.outcomes.map((outcome) => outcome.label),
    ...previousResult.outcomes.map((outcome) => outcome.label),
  ])

  return Array.from(labels)
    .map((label) => {
      const currentProbability =
        currentResult.outcomes.find((outcome) => outcome.label === label)?.probability ?? 0
      const previousProbability =
        previousResult.outcomes.find((outcome) => outcome.label === label)?.probability ?? 0

      return {
        label,
        currentProbability,
        previousProbability,
        delta: currentProbability - previousProbability,
      }
    })
    .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
}

function emptyVersionDiff(): VersionDiff {
  return {
    addedNodeIds: [],
    changedNodeIds: [],
    removedNodeIds: [],
    addedEdgeIds: [],
    changedEdgeIds: [],
    removedEdgeIds: [],
  }
}
