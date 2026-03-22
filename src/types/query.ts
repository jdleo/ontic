export const comparisonModes = ['single', 'ranked', 'binary'] as const

export type ComparisonMode = (typeof comparisonModes)[number]

export type StructuredQuery = {
  question: string
  timeframe?: string
  targetOutcomes: string[]
  focusNodeIds?: string[]
  comparisonMode?: ComparisonMode
}

export type QueryResultOutcome = {
  label: string
  probability: number
}

export type QueryResultDriver = {
  label: string
  impact: number
}

export type QueryResult = {
  outcomes: QueryResultOutcome[]
  keyDrivers: QueryResultDriver[]
  modelConfidence: number
  notes?: string[]
}

export type QueryRecord = {
  id: string
  worldId: string
  versionId: string
  createdAt: number
  query: StructuredQuery
}

export type QueryResultRecord = {
  id: string
  queryId: string
  createdAt: number
  result: QueryResult
}
