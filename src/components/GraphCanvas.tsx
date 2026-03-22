import { useEffect, useState } from 'react'
import {
  Background,
  BaseEdge,
  Controls,
  getBezierPath,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
  type OnConnect,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { EdgePolarity, OntologyEdgeType, OntologyNode, OntologyNodeType } from '../types'
import { useWorldStore } from '../store/useWorldStore'

const nodeToneByType: Record<OntologyNodeType, string> = {
  actor: 'bg-white text-black',
  institution: 'bg-white/80 text-black',
  resource: 'bg-white/60 text-black',
  event: 'bg-white/28 text-white',
  belief: 'bg-white/22 text-white',
  constraint: 'bg-white/18 text-white',
  objective: 'bg-white/14 text-white',
  outcome: 'bg-white/10 text-white',
}

const nodeTypes = {
  ontology: OntologyNodeCard,
}

const edgeTypes = {
  ontology: OntologyEdgeView,
}

type OntologyCanvasNodeData = {
  node: OntologyNode
}

type OntologyFlowNode = Node<OntologyCanvasNodeData, 'ontology'>

type OntologyCanvasEdgeData = {
  relation: OntologyEdgeType
  confidence: number
  polarity: EdgePolarity
}

type OntologyFlowEdge = Edge<OntologyCanvasEdgeData, 'ontology'>

export function GraphCanvas() {
  const currentVersion = useWorldStore((state) => state.currentVersion)
  const selectedGraph = useWorldStore((state) => state.selectedGraph)
  const selectNode = useWorldStore((state) => state.selectNode)
  const selectEdge = useWorldStore((state) => state.selectEdge)
  const clearSelection = useWorldStore((state) => state.clearSelection)
  const moveNode = useWorldStore((state) => state.moveNode)
  const createEdge = useWorldStore((state) => state.createEdge)
  const deleteSelectedGraphItem = useWorldStore((state) => state.deleteSelectedGraphItem)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target

      if (
        !(target instanceof HTMLElement) ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable === true
      ) {
        return
      }

      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault()
        void deleteSelectedGraphItem()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [deleteSelectedGraphItem])

  if (!currentVersion) {
    return (
      <section className="shell-panel relative min-h-[540px] overflow-hidden rounded-[2rem]">
        <div className="shell-grid absolute inset-0" />
        <div className="relative flex h-full min-h-[540px] flex-col">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
            <div>
              <p className="shell-label">Center Canvas</p>
              <h2 className="shell-title mt-2">Ontology graph surface</h2>
            </div>
          </div>

          <div className="grid flex-1 place-items-center px-6 py-8">
          <div className="shell-card w-full max-w-3xl rounded-[1.9rem] border-dashed px-8 py-12 text-center">
            <p className="shell-label">No world loaded</p>
            <h2 className="mt-4 font-[var(--font-family-serif)] text-3xl tracking-[var(--tracking-display)] text-[var(--color-text)]">
              Load a world to edit its ontology
            </h2>
            <p className="shell-copy mx-auto mt-4 max-w-2xl text-sm leading-7">
              Saved nodes and edges will render here with direct editing,
              relation wiring, and graph navigation controls.
            </p>
          </div>
        </div>
        </div>
      </section>
    )
  }

  const nodes: OntologyFlowNode[] = currentVersion.ontology.nodes.map((node) => ({
    id: node.id,
    type: 'ontology',
    position: node.position,
    selected: selectedGraph?.kind === 'node' && selectedGraph.id === node.id,
    data: {
      node,
    },
  }))

  const edges: OntologyFlowEdge[] = currentVersion.ontology.edges.map((edge) => ({
    id: edge.id,
    type: 'ontology',
    source: edge.source,
    target: edge.target,
    label: edge.type.replaceAll('_', ' '),
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: edgeStrokeByPolarity(edge.data.polarity),
    },
    selected: selectedGraph?.kind === 'edge' && selectedGraph.id === edge.id,
    data: {
      relation: edge.type,
      confidence: edge.data.confidence ?? 0.5,
      polarity: edge.data.polarity ?? 'mixed',
    },
  }))

  const onConnect: OnConnect = (connection) => {
    if (!connection.source || !connection.target) {
      return
    }

    void createEdge({
      source: connection.source,
      target: connection.target,
    })
  }

  return (
    <section className="shell-panel relative min-h-[540px] overflow-hidden rounded-[2rem]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgb(255_255_255_/_0.08),transparent_58%)]" />
      <div className="relative flex h-full min-h-[540px] flex-col">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <p className="shell-label">Center Canvas</p>
            <h2 className="shell-title mt-2">Ontology graph surface</h2>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="shell-pill px-3 py-1 text-xs">
              {currentVersion.ontology.nodes.length} nodes
            </span>
            <span className="shell-pill px-3 py-1 text-xs">
              {currentVersion.ontology.edges.length} edges
            </span>
            <button
              type="button"
              onClick={() => void deleteSelectedGraphItem()}
              disabled={!selectedGraph}
              className="shell-button-secondary px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            >
              Delete selection
            </button>
          </div>
        </div>

        <div className="h-[540px] flex-1">
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              minZoom={0.25}
              maxZoom={1.8}
              defaultEdgeOptions={{ type: 'ontology' }}
              onNodeClick={(_, node) => selectNode(node.id)}
              onEdgeClick={(_, edge) => selectEdge(edge.id)}
              onPaneClick={() => clearSelection()}
              onNodeDragStop={(_, node) => void moveNode(node.id, node.position)}
              onConnect={onConnect}
              proOptions={{ hideAttribution: true }}
              className="bg-transparent"
            >
              <Background gap={32} size={1} color="var(--color-grid)" />
              <MiniMap
                pannable
                zoomable
                nodeColor={(node) => {
                  const graphNode = currentVersion.ontology.nodes.find((item) => item.id === node.id)
                  return graphNode ? miniMapColor(graphNode.type) : '#fff'
                }}
                maskColor="rgb(0 0 0 / 0.45)"
                className="!rounded-[1.25rem] !border !border-[var(--color-border)] !bg-black/60"
              />
              <Controls
                className="!overflow-hidden !rounded-[1.25rem] !border !border-[var(--color-border)] !bg-black/70"
                showInteractive={false}
              />
            </ReactFlow>
          </ReactFlowProvider>
        </div>
      </div>
    </section>
  )
}

function OntologyNodeCard({ data, selected }: NodeProps<OntologyFlowNode>) {
  const renameNode = useWorldStore((state) => state.renameNode)
  const [draftLabel, setDraftLabel] = useState('')
  const [editing, setEditing] = useState(false)

  const confidence = data.node.data.confidence ?? 0.5

  const commitRename = () => {
    const nextLabel = draftLabel.trim()
    setEditing(false)

    if (!nextLabel || nextLabel === data.node.label) {
      setDraftLabel(data.node.label)
      return
    }

    void renameNode(data.node.id, nextLabel)
  }

  return (
    <div
      className={`min-w-[200px] rounded-[1.4rem] border px-4 py-3 shadow-[var(--shadow-md)] backdrop-blur ${selected ? 'border-white/50 bg-black/85' : 'border-white/12 bg-black/70'}`}
      onDoubleClick={() => {
        setDraftLabel(data.node.label)
        setEditing(true)
      }}
    >
      <Handle type="target" position={Position.Left} className="!border-none !bg-white/70" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              autoFocus
              value={draftLabel}
              onChange={(event) => setDraftLabel(event.target.value)}
              onBlur={commitRename}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  commitRename()
                }

                if (event.key === 'Escape') {
                  setDraftLabel(data.node.label)
                  setEditing(false)
                }
              }}
              className="w-full rounded-full border border-white/20 bg-white/8 px-3 py-1.5 text-sm text-white outline-none"
            />
          ) : (
            <p className="truncate text-sm font-medium text-white">{data.node.label}</p>
          )}
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/48">{data.node.id}</p>
        </div>

        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${nodeToneByType[data.node.type]}`}>
          {data.node.type}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[11px] text-white/62">
        <span>Confidence</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-white/75" style={{ width: `${confidence * 100}%` }} />
        </div>
        <span>{Math.round(confidence * 100)}%</span>
      </div>

      {data.node.data.description ? (
        <p className="mt-3 line-clamp-2 text-xs leading-5 text-white/62">{data.node.data.description}</p>
      ) : null}

      <Handle type="source" position={Position.Right} className="!border-none !bg-white/85" />
    </div>
  )
}

function OntologyEdgeView({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  selected,
  data,
  markerEnd,
}: EdgeProps<OntologyFlowEdge>) {
  const stroke = edgeStrokeByPolarity(data?.polarity)
  const confidence = data?.confidence ?? 0.5
  const [path] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke,
          strokeWidth: selected ? 3.2 : 1.4 + confidence * 2,
          opacity: 0.55 + confidence * 0.45,
        }}
        markerEnd={markerEnd}
      />
      <foreignObject
        width={180}
        height={40}
        x={(sourceX + targetX) / 2 - 90}
        y={(sourceY + targetY) / 2 - 20}
        requiredExtensions="http://www.w3.org/1999/xhtml"
      >
        <div className="flex justify-center">
          <span className="rounded-full border border-white/12 bg-black/75 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/70">
            {data?.relation.replaceAll('_', ' ')} · {Math.round(confidence * 100)}%
          </span>
        </div>
      </foreignObject>
    </>
  )
}

function edgeStrokeByPolarity(polarity: EdgePolarity | undefined) {
  if (polarity === 'positive') {
    return 'rgb(255 255 255 / 0.85)'
  }

  if (polarity === 'negative') {
    return 'rgb(255 255 255 / 0.45)'
  }

  return 'rgb(255 255 255 / 0.65)'
}

function miniMapColor(type: OntologyNodeType) {
  if (type === 'actor' || type === 'institution' || type === 'resource') {
    return '#f1f1f1'
  }

  if (type === 'outcome') {
    return '#8f8f8f'
  }

  return '#c1c1c1'
}
