import { mutationPatchSchema } from '../types'
import type { MutationPatch, Ontology, WorldVersion } from '../types'
import { validateOntologyIntegrity } from '../types'

export function applyMutationPatch(version: WorldVersion, patch: MutationPatch): WorldVersion {
  const validatedPatch = mutationPatchSchema.parse(patch)
  const ontology: Ontology = {
    ...version.ontology,
    nodes: [
      ...version.ontology.nodes.map((node) => {
        const update = validatedPatch.updateNodes?.find((candidate) => candidate.id === node.id)

        if (!update) {
          return node
        }

        return {
          ...node,
          label: update.changes.label ?? node.label,
          data: {
            ...node.data,
            description:
              update.changes.description === undefined
                ? node.data.description
                : update.changes.description,
            attributes: update.changes.attributes ?? node.data.attributes,
            confidence:
              update.changes.confidence === undefined
                ? node.data.confidence
                : update.changes.confidence,
            observed:
              update.changes.observed === undefined
                ? node.data.observed
                : update.changes.observed,
          },
        }
      }),
      ...(validatedPatch.addNodes ?? []),
    ],
    edges: [
      ...version.ontology.edges.map((edge) => {
        const update = validatedPatch.updateEdges?.find((candidate) => candidate.id === edge.id)

        if (!update) {
          return edge
        }

        return {
          ...edge,
          type: update.changes.type ?? edge.type,
          data: {
            ...edge.data,
            weight:
              update.changes.weight === undefined ? edge.data.weight : update.changes.weight,
            polarity:
              update.changes.polarity === undefined ? edge.data.polarity : update.changes.polarity,
            confidence:
              update.changes.confidence === undefined
                ? edge.data.confidence
                : update.changes.confidence,
          },
        }
      }),
      ...(validatedPatch.addEdges ?? []),
    ],
    variables: [
      ...version.ontology.variables.map((variable) => {
        const update = validatedPatch.updateVariables?.find((candidate) => candidate.id === variable.id)
        return update ? { ...variable, ...update.changes } : variable
      }),
      ...(validatedPatch.addVariables ?? []),
    ],
    events: [...version.ontology.events, ...(validatedPatch.addEvents ?? [])],
    assumptions: [...version.ontology.assumptions, ...(validatedPatch.addAssumptions ?? [])],
    actors: version.ontology.actors,
  }

  const issues = validateOntologyIntegrity(ontology)

  if (issues.length > 0) {
    throw new Error(issues.map((issue) => issue.message).join(' '))
  }

  return {
    ...version,
    ontology,
    patchSummary: validatedPatch.patchSummary ?? version.patchSummary,
  }
}
