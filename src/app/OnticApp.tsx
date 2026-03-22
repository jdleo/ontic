import { useState } from 'react'
import { GraphCanvas } from '../components/GraphCanvas'
import { LeftSidebar } from '../components/LeftSidebar'
import { RightPanel } from '../components/RightPanel'
import { SettingsModal } from '../components/SettingsModal'
import { useWorldStore } from '../store/useWorldStore'

export function OnticApp() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const hasOpenRouterKey = useWorldStore((state) => state.hasOpenRouterKey)
  const loadingBootstrap = useWorldStore((state) => state.loading.bootstrap)
  const modelTierConfig = useWorldStore((state) => state.modelTierConfig)

  const setupRequired = !loadingBootstrap && !hasOpenRouterKey

  return (
    <div className="min-h-screen bg-transparent text-[var(--text)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 py-4 sm:px-6 sm:py-6">
        <header className="relative mb-4 overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[var(--shadow)] sm:p-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.15),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.12),transparent_28%)]" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
                Ontic Workspace
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
                Local-first ontology modeling with explicit model control
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
                Worlds stay in the browser. OpenRouter setup and model tier routing
                are now managed in-app so future parsing, mutation, and explanation
                flows can start from a consistent local configuration.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 xl:items-end">
              <div className="flex flex-wrap gap-2">
                <ShellMetric
                  label="Model access"
                  value={hasOpenRouterKey ? 'Configured' : 'Setup required'}
                />
                <ShellMetric label="Light tier" value={modelTierConfig.low} />
                <ShellMetric label="Heavy tier" value={modelTierConfig.high} />
              </div>

              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="rounded-full border border-[var(--border)] bg-[rgba(7,17,31,0.72)] px-5 py-2.5 text-sm font-medium text-white transition hover:border-[var(--accent)]"
              >
                {hasOpenRouterKey ? 'Open settings' : 'Complete setup'}
              </button>
            </div>
          </div>
        </header>

        {setupRequired ? (
          <section className="mb-4 rounded-[24px] border border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.08)] px-5 py-4 text-sm text-[var(--text)]">
            LLM-backed flows are blocked until an OpenRouter key is configured.
            Local worlds remain available and removing the key will not delete them.
          </section>
        ) : null}

        <main className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
          <LeftSidebar />
          <GraphCanvas />
          <RightPanel />
        </main>
      </div>

      <SettingsModal
        open={settingsOpen || setupRequired}
        required={setupRequired}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}

type ShellMetricProps = {
  label: string
  value: string
}

function ShellMetric({ label, value }: ShellMetricProps) {
  return (
    <div className="rounded-full border border-[var(--border)] bg-[rgba(7,17,31,0.72)] px-4 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-white">{value}</p>
    </div>
  )
}
