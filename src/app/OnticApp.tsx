import { useState } from 'react'
import { GraphCanvas } from '../components/GraphCanvas'
import { LeftSidebar } from '../components/LeftSidebar'
import { RightPanel } from '../components/RightPanel'
import { SettingsModal } from '../components/SettingsModal'
import { useWorldStore } from '../store/useWorldStore'
import onticMark from '../assets/ontic-nobg.png'

export function OnticApp() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const hasOpenRouterKey = useWorldStore((state) => state.hasOpenRouterKey)
  const loadingBootstrap = useWorldStore((state) => state.loading.bootstrap)
  const modelTierConfig = useWorldStore((state) => state.modelTierConfig)

  const setupRequired = !loadingBootstrap && !hasOpenRouterKey

  return (
    <div className="min-h-screen bg-transparent text-[var(--color-text)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[var(--shell-max-width)] flex-col px-4 py-4 sm:px-6 sm:py-6">
        <header className="shell-panel relative mb-4 overflow-hidden rounded-[2rem] px-5 py-5 xl:px-7">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgb(255_255_255_/_0.12),transparent_60%)]" />
          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3">
                <img
                  src={onticMark}
                  alt="Ontic"
                  className="h-10 w-10 object-contain opacity-95"
                />
                <p className="shell-label">
                  Ontic Workspace
                </p>
              </div>
              <h1 className="shell-display mt-3 max-w-4xl">
                Turn natural-language scenarios into persistent world snapshots
              </h1>
              <p className="shell-copy mt-4 max-w-2xl text-sm sm:text-base">
                Create the first ontology from text, keep it local, and branch
                later edits without overwriting the original snapshot.
              </p>
            </div>

            <div className="grid gap-2.5 text-sm sm:grid-cols-3 xl:min-w-[440px]">
              <ShellMetric
                label="Model access"
                value={hasOpenRouterKey ? 'Parser ready' : 'Setup required'}
              />
              <ShellMetric label="Medium tier" value={modelTierConfig.medium} />
              <ShellMetric label="Heavy tier" value={modelTierConfig.high} />
            </div>
          </div>

          <div className="relative mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="shell-button-primary px-5 py-2.5 text-sm font-medium"
            >
              {hasOpenRouterKey ? 'Open settings' : 'Complete setup'}
            </button>
            {setupRequired ? (
              <p className="shell-copy text-sm">
                LLM-backed flows are blocked until an OpenRouter key is configured. Removing the key does not delete worlds.
              </p>
            ) : null}
          </div>
        </header>

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
    <div className="shell-card rounded-[1.4rem] px-4 py-3.5">
      <p className="shell-label text-[0.68rem]">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-[var(--color-text)]">{value}</p>
    </div>
  )
}
