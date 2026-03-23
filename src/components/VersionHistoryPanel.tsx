import { useState } from 'react'
import { diffVersions, getLatestQueryResultForVersion, getParentVersion } from '../lib/versioning'
import { PanelCard } from './QueryPanel'
import { useWorldStore } from '../store/useWorldStore'

export function VersionHistoryPanel() {
  const [historyOpen, setHistoryOpen] = useState(false)
  const currentWorld = useWorldStore((state) => state.currentWorld)
  const currentVersion = useWorldStore((state) => state.currentVersion)
  const versions = useWorldStore((state) => state.versions)
  const queries = useWorldStore((state) => state.queries)
  const queryResults = useWorldStore((state) => state.queryResults)
  const worldCreationSummary = useWorldStore((state) => state.worldCreationSummary)
  const switchVersion = useWorldStore((state) => state.switchVersion)

  if (!currentWorld || !currentVersion) {
    return (
      <PanelCard
        eyebrow="Versions"
        title="Version history"
        body="Create or load a world to inspect immutable snapshots and branch from earlier states."
      />
    )
  }

  const orderedVersions = [...versions].sort((left, right) => right.createdAt - left.createdAt)
  const parentVersion = getParentVersion(versions, currentVersion)
  const diff = diffVersions(parentVersion, currentVersion)

  return (
    <section className="shell-card rounded-[1.5rem] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="shell-label text-[0.7rem]">Versions</p>
          <h3 className="mt-2 text-base font-medium tracking-[var(--tracking-tight)] text-[var(--color-text)]">
            Version history
          </h3>
        </div>
        <span className="shell-pill px-3 py-1 text-xs">
          {versions.length} total
        </span>
      </div>

      <div className="mt-3 rounded-[1rem] border border-white/8 bg-white/4 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">
              Active snapshot: {currentVersion.patchSummary ?? 'Snapshot update'}
            </p>
            <p className="mt-2 text-xs text-white/60">
              {new Date(currentVersion.createdAt).toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setHistoryOpen((open) => !open)}
            aria-expanded={historyOpen}
            className="shell-pill shrink-0 px-3 py-1 text-[11px] transition hover:border-white/18 hover:bg-white/10"
          >
            {historyOpen ? 'Hide history' : 'Show history'}
          </button>
        </div>
      </div>

      {historyOpen ? (
        <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
          {orderedVersions.map((version, index) => {
            const latestResult = getLatestQueryResultForVersion(version.id, queries, queryResults)
            const isCurrent = version.id === currentVersion.id

            return (
              <button
                key={version.id}
                type="button"
                onClick={() => void switchVersion(version.id)}
                className={`w-full rounded-[1rem] border px-3 py-3 text-left transition ${isCurrent ? 'border-amber-300/35 bg-amber-300/10' : 'border-white/8 bg-white/4 hover:border-white/18 hover:bg-white/7'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-white">
                    v{orderedVersions.length - index}
                  </span>
                  {isCurrent ? (
                    <span className="rounded-full bg-amber-300/18 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-100">
                      Active
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-white/80">
                  {version.patchSummary ?? 'Snapshot update'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/56">
                  <span>{new Date(version.createdAt).toLocaleString()}</span>
                  <span>{latestResult ? 'Has query result' : 'No query result yet'}</span>
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <p className="mt-3 text-xs text-white/56">
          History stays collapsed by default to keep the right rail readable as versions accumulate.
        </p>
      )}

      <div className="mt-4 rounded-[1rem] border border-white/8 bg-white/4 px-3 py-3">
        <p className="shell-label text-[0.68rem]">Current diff</p>
        <p className="mt-2 text-sm text-white/78">
          {parentVersion
            ? `Comparing ${currentVersion.patchSummary ?? 'current version'} against ${parentVersion.patchSummary ?? 'its parent'}.`
            : 'Initial snapshot. Everything in view is newly introduced.'}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <DiffPill label="Added nodes" value={diff.addedNodeIds.length} />
          <DiffPill label="Changed nodes" value={diff.changedNodeIds.length} />
          <DiffPill label="Added edges" value={diff.addedEdgeIds.length} />
          <DiffPill label="Changed edges" value={diff.changedEdgeIds.length} />
        </div>
        <p className="mt-3 text-xs text-white/56">
          To branch from an older snapshot, switch to it here and apply a mutation or graph edit from that version.
        </p>
        {!parentVersion && worldCreationSummary ? (
          <p className="mt-3 text-xs leading-5 text-amber-100/88">
            Cleanup summary: {worldCreationSummary}
          </p>
        ) : null}
      </div>
    </section>
  )
}

function DiffPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-white/72">
      {label}: {value}
    </span>
  )
}
