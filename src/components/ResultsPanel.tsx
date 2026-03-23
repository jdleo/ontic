import { getLatestQueryResultForVersion, getOutcomeDeltas, getParentVersion } from '../lib/versioning'
import { PanelCard } from './QueryPanel'
import { useWorldStore } from '../store/useWorldStore'

export function ResultsPanel() {
  const currentResult = useWorldStore((state) => state.currentResult)
  const currentVersion = useWorldStore((state) => state.currentVersion)
  const versions = useWorldStore((state) => state.versions)
  const queries = useWorldStore((state) => state.queries)
  const queryResults = useWorldStore((state) => state.queryResults)

  const parentVersion = getParentVersion(versions, currentVersion)
  const previousResultRecord = parentVersion
    ? getLatestQueryResultForVersion(parentVersion.id, queries, queryResults)
    : null
  const outcomeDeltas = getOutcomeDeltas(currentResult, previousResultRecord?.result.result)

  if (!currentResult) {
    return (
      <PanelCard
        eyebrow="Results"
        title="Simulation outputs"
        body="Probability breakdowns, key drivers, and explanation text will render here."
      />
    )
  }

  return (
    <section className="shell-card rounded-[1.5rem] p-4">
      <p className="shell-label text-[0.7rem]">Results</p>
      <h3 className="mt-2 text-base font-medium tracking-[var(--tracking-tight)] text-[var(--color-text)]">
        Simulation outputs
      </h3>
      <div className="mt-3 space-y-2">
        {currentResult.outcomes.map((outcome) => (
          <div key={outcome.label} className="flex items-center justify-between gap-3 rounded-[1rem] border border-white/8 bg-white/4 px-3 py-2 text-sm">
            <span className="text-white">{outcome.label}</span>
            <span className="text-white/72">{Math.round(outcome.probability * 100)}%</span>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <p className="shell-label text-[0.68rem]">Key drivers</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {currentResult.keyDrivers.map((driver) => (
            <span key={driver.label} className="shell-pill px-3 py-1 text-xs">
              {driver.label}
            </span>
          ))}
        </div>
      </div>
      {currentResult.notes?.length ? (
        <p className="shell-copy mt-4 text-sm">{currentResult.notes[0]}</p>
      ) : null}
      {outcomeDeltas.length > 0 ? (
        <div className="mt-4">
          <p className="shell-label text-[0.68rem]">Versus parent version</p>
          <div className="mt-2 space-y-2">
            {outcomeDeltas.slice(0, 4).map((outcome) => (
              <div
                key={outcome.label}
                className="flex items-center justify-between gap-3 rounded-[1rem] border border-amber-300/20 bg-amber-300/8 px-3 py-2 text-sm"
              >
                <span className="text-white">{outcome.label}</span>
                <span className={outcome.delta >= 0 ? 'text-emerald-200' : 'text-rose-200'}>
                  {outcome.delta >= 0 ? '+' : ''}
                  {Math.round(outcome.delta * 100)} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
