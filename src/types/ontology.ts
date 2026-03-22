export const ontologyNodeTypes = [
  'actor',
  'institution',
  'resource',
  'event',
  'belief',
  'constraint',
  'objective',
  'outcome',
] as const

export const ontologyEdgeTypes = [
  'influences',
  'competes_with',
  'supports',
  'constrains',
  'depends_on',
  'observes',
  'causes',
] as const

export const edgePolarities = ['positive', 'negative', 'mixed'] as const

export const variableDistributionKinds = [
  'fixed',
  'uniform',
  'normal',
  'categorical',
] as const

export const eventEffectTargetTypes = ['node', 'edge', 'variable', 'actor'] as const

export type OntologyNodeType = (typeof ontologyNodeTypes)[number]
export type OntologyEdgeType = (typeof ontologyEdgeTypes)[number]
export type EdgePolarity = (typeof edgePolarities)[number]
export type VariableDistributionKind = (typeof variableDistributionKinds)[number]
export type EventEffectTargetType = (typeof eventEffectTargetTypes)[number]

export type OntologyNode = {
  id: string
  type: OntologyNodeType
  label: string
  position: { x: number; y: number }
  data: {
    description?: string
    attributes?: Record<string, unknown>
    confidence?: number
    observed?: boolean
  }
}

export type OntologyEdge = {
  id: string
  source: string
  target: string
  type: OntologyEdgeType
  data: {
    weight?: number
    polarity?: EdgePolarity
    confidence?: number
  }
}

export type StateVariableDistribution = {
  kind: VariableDistributionKind
  value?: number | string
  min?: number
  max?: number
  mean?: number
  std?: number
  options?: { label: string; p: number }[]
}

export type StateVariable = {
  id: string
  key: string
  label: string
  ownerId?: string
  distribution: StateVariableDistribution
}

export type ActorGoal = {
  label: string
  weight: number
}

export type ActorModel = {
  actorId: string
  goals: ActorGoal[]
  constraints: string[]
  actionSpace: string[]
  riskTolerance?: number
  timeHorizonDays?: number
}

export type WorldEventEffect = {
  targetType: EventEffectTargetType
  targetId: string
  delta?: number
  set?: unknown
}

export type WorldEvent = {
  id: string
  label: string
  description?: string
  timestamp: number
  effects?: WorldEventEffect[]
}

export type Assumption = {
  id: string
  label: string
  confidence?: number
}

export type Ontology = {
  nodes: OntologyNode[]
  edges: OntologyEdge[]
  variables: StateVariable[]
  actors: ActorModel[]
  events: WorldEvent[]
  assumptions: Assumption[]
}
