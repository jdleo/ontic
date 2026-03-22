import { useState } from 'react'
import type { OntologyEdge, OntologyNode } from '../types'
import { edgePolarities, ontologyEdgeTypes, ontologyNodeTypes } from '../types'
import { PanelCard } from './QueryPanel'
import { useWorldStore } from '../store/useWorldStore'

export function InspectPanel() {
  const currentVersion = useWorldStore((state) => state.currentVersion)
  const selectedGraph = useWorldStore((state) => state.selectedGraph)

  const selectedNode =
    selectedGraph?.kind === 'node'
      ? currentVersion?.ontology.nodes.find((node) => node.id === selectedGraph.id) ?? null
      : null
  const selectedEdge =
    selectedGraph?.kind === 'edge'
      ? currentVersion?.ontology.edges.find((edge) => edge.id === selectedGraph.id) ?? null
      : null

  if (!selectedGraph || (!selectedNode && !selectedEdge)) {
    return (
      <PanelCard
        eyebrow="Inspect"
        title="Selected node and edge details"
        body="Select a node or edge in the graph to edit labels, relation metadata, confidence, and delete the current selection."
      />
    )
  }

  if (selectedNode) {
    return <NodeInspector key={selectedNode.id} node={selectedNode} />
  }

  return <EdgeInspector key={selectedEdge!.id} edge={selectedEdge!} />
}

function NodeInspector({ node }: { node: OntologyNode }) {
  const updateNode = useWorldStore((state) => state.updateNode)
  const deleteSelectedGraphItem = useWorldStore((state) => state.deleteSelectedGraphItem)
  const [label, setLabel] = useState(node.label)
  const [description, setDescription] = useState(node.data.description ?? '')

  return (
    <section className="shell-card rounded-[1.5rem] p-4">
      <p className="shell-label text-[0.7rem]">Inspect</p>
      <h3 className="mt-2 text-base font-medium tracking-[var(--tracking-tight)] text-[var(--color-text)]">
        Edit node
      </h3>
      <p className="shell-copy mt-2 text-sm">{node.id}</p>

      <label className="mt-4 block text-sm text-white/72">
        Label
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          onBlur={() => void updateNode(node.id, { label: label.trim() || node.label })}
          className="mt-2 w-full rounded-[1rem] border border-white/12 bg-white/6 px-3 py-2 text-sm text-white outline-none"
        />
      </label>

      <label className="mt-3 block text-sm text-white/72">
        Type
        <select
          value={node.type}
          onChange={(event) => void updateNode(node.id, { type: event.target.value as (typeof ontologyNodeTypes)[number] })}
          className="mt-2 w-full rounded-[1rem] border border-white/12 bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none"
        >
          {ontologyNodeTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-3 block text-sm text-white/72">
        Confidence
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={node.data.confidence ?? 0.5}
          onChange={(event) => void updateNode(node.id, { confidence: Number(event.target.value) })}
          className="mt-2 w-full"
        />
      </label>

      <label className="mt-3 block text-sm text-white/72">
        Description
        <textarea
          value={description}
          rows={3}
          onChange={(event) => setDescription(event.target.value)}
          onBlur={() => void updateNode(node.id, { description: description.trim() || undefined })}
          className="mt-2 w-full rounded-[1rem] border border-white/12 bg-white/6 px-3 py-2 text-sm text-white outline-none"
        />
      </label>

      <label className="mt-3 flex items-center gap-2 text-sm text-white/72">
        <input
          type="checkbox"
          checked={node.data.observed ?? false}
          onChange={(event) => void updateNode(node.id, { observed: event.target.checked })}
        />
        Observed signal
      </label>

      <button
        type="button"
        onClick={() => void deleteSelectedGraphItem()}
        className="shell-button-secondary mt-4 w-full px-4 py-2.5 text-sm"
      >
        Delete node
      </button>
    </section>
  )
}

function EdgeInspector({ edge }: { edge: OntologyEdge }) {
  const updateEdge = useWorldStore((state) => state.updateEdge)
  const deleteSelectedGraphItem = useWorldStore((state) => state.deleteSelectedGraphItem)
  const [weight, setWeight] = useState(edge.data.weight?.toString() ?? '')

  return (
    <section className="shell-card rounded-[1.5rem] p-4">
      <p className="shell-label text-[0.7rem]">Inspect</p>
      <h3 className="mt-2 text-base font-medium tracking-[var(--tracking-tight)] text-[var(--color-text)]">
        Edit edge
      </h3>
      <p className="shell-copy mt-2 text-sm">
        {edge.source} → {edge.target}
      </p>

      <label className="mt-4 block text-sm text-white/72">
        Relation
        <select
          value={edge.type}
          onChange={(event) => void updateEdge(edge.id, { type: event.target.value as (typeof ontologyEdgeTypes)[number] })}
          className="mt-2 w-full rounded-[1rem] border border-white/12 bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none"
        >
          {ontologyEdgeTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-3 block text-sm text-white/72">
        Polarity
        <select
          value={edge.data.polarity ?? 'mixed'}
          onChange={(event) => void updateEdge(edge.id, { polarity: event.target.value as (typeof edgePolarities)[number] })}
          className="mt-2 w-full rounded-[1rem] border border-white/12 bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none"
        >
          {edgePolarities.map((polarity) => (
            <option key={polarity} value={polarity}>
              {polarity}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-3 block text-sm text-white/72">
        Confidence
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={edge.data.confidence ?? 0.5}
          onChange={(event) => void updateEdge(edge.id, { confidence: Number(event.target.value) })}
          className="mt-2 w-full"
        />
      </label>

      <label className="mt-3 block text-sm text-white/72">
        Weight
        <input
          value={weight}
          onChange={(event) => setWeight(event.target.value)}
          onBlur={() => {
            const value = Number(weight)
            void updateEdge(edge.id, { weight: Number.isFinite(value) ? value : undefined })
          }}
          className="mt-2 w-full rounded-[1rem] border border-white/12 bg-white/6 px-3 py-2 text-sm text-white outline-none"
        />
      </label>

      <button
        type="button"
        onClick={() => void deleteSelectedGraphItem()}
        className="shell-button-secondary mt-4 w-full px-4 py-2.5 text-sm"
      >
        Delete edge
      </button>
    </section>
  )
}
