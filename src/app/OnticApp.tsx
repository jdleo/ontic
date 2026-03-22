import { GraphCanvas } from '../components/GraphCanvas'
import { LeftSidebar } from '../components/LeftSidebar'
import { RightPanel } from '../components/RightPanel'
import { SettingsModal } from '../components/SettingsModal'

export function OnticApp() {
  return (
    <div className="min-h-screen bg-transparent text-[var(--text)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-4 py-4 sm:px-6 sm:py-6">
        <header className="mb-4 overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--panel-soft)] px-5 py-4 shadow-[var(--shadow)] backdrop-blur xl:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--accent)]">
                Ontic Workspace
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                Browser-first ontology and simulation shell
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-[var(--muted)] sm:text-base">
                The workspace is now split into the left control rail, center
                graph canvas, and right-side task panels so feature work can land
                without reworking the root app tree.
              </p>
            </div>

            <div className="grid gap-2 text-sm text-[var(--muted)] sm:grid-cols-3 xl:min-w-[420px]">
              <ShellMetric label="Persistence" value="Local-first" />
              <ShellMetric label="Inference" value="Worker-ready" />
              <ShellMetric label="Models" value="Settings-driven" />
            </div>
          </div>
        </header>

        <main className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
          <LeftSidebar />
          <GraphCanvas />
          <RightPanel />
        </main>
      </div>

      <SettingsModal />
    </div>
  )
}

type ShellMetricProps = {
  label: string
  value: string
}

function ShellMetric({ label, value }: ShellMetricProps) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[rgba(8,18,34,0.55)] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-white">{value}</p>
    </div>
  )
}
