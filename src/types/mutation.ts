import type {
  Assumption,
  OntologyEdge,
  OntologyNode,
  StateVariable,
  WorldEvent,
} from './ontology'

export type NodePatch = {
  id: string
  changes: Partial<OntologyNode['data']> & { label?: string }
}

export type EdgePatch = {
  id: string
  changes: Partial<OntologyEdge['data']> & { type?: OntologyEdge['type'] }
}

export type VariablePatch = {
  id: string
  changes: Partial<StateVariable>
}

export type MutationPatch = {
  addNodes?: OntologyNode[]
  updateNodes?: NodePatch[]
  addEdges?: OntologyEdge[]
  updateEdges?: EdgePatch[]
  addVariables?: StateVariable[]
  updateVariables?: VariablePatch[]
  addEvents?: WorldEvent[]
  addAssumptions?: Assumption[]
  patchSummary?: string
}

export type MutationRecord = {
  id: string
  worldId: string
  baseVersionId: string
  createdAt: number
  patch: MutationPatch
}
