import { GraphCanvas } from '../components/GraphCanvas'
import { LeftSidebar } from '../components/LeftSidebar'
import { RightPanel } from '../components/RightPanel'
import { SettingsModal } from '../components/SettingsModal'

export function OnticApp() {
  return (
    <div className="min-h-screen bg-transparent text-[var(--color-text)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[var(--shell-max-width)] flex-col px-4 py-4 sm:px-6 sm:py-6">
        <header className="shell-panel relative mb-4 overflow-hidden rounded-[2rem] px-5 py-5 xl:px-7">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgb(255_255_255_/_0.12),transparent_60%)]" />
          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="shell-label">
                Ontic Workspace
              </p>
              <h1 className="shell-display mt-3 max-w-4xl">
                A dark editorial shell for ontology modeling and probabilistic playbooks
              </h1>
              <p className="shell-copy mt-4 max-w-2xl text-sm sm:text-base">
                The shell now leans into restrained contrast, rounded high-signal
                controls, and tokenized surfaces so future feature work can reuse
                one coherent visual system instead of one-off styling.
              </p>
            </div>

            <div className="grid gap-2.5 text-sm sm:grid-cols-3 xl:min-w-[440px]">
              <ShellMetric label="Persistence" value="Local-first state" />
              <ShellMetric label="Inference" value="Client-side workers" />
              <ShellMetric label="Models" value="Tiered orchestration" />
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
    <div className="shell-card rounded-[1.4rem] px-4 py-3.5">
      <p className="shell-label text-[0.68rem]">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-[var(--color-text)]">{value}</p>
    </div>
  )
}
