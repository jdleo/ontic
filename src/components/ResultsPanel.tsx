import { PanelCard } from './QueryPanel'
import { useWorldStore } from '../store/useWorldStore'

export function ResultsPanel() {
  const currentResult = useWorldStore((state) => state.currentResult)

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
    </section>
  )
}
