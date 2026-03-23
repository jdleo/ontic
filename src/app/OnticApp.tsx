import { useState } from 'react'
import { CreateWorldModal } from '../components/CreateWorldModal'
import { GraphCanvas } from '../components/GraphCanvas'
import { RightPanel } from '../components/RightPanel'
import { SettingsModal } from '../components/SettingsModal'
import { useWorldStore } from '../store/useWorldStore'
import onticMark from '../assets/ontic-nobg.png'

export function OnticApp() {
  const [createWorldOpen, setCreateWorldOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const hasOpenRouterKey = useWorldStore((state) => state.hasOpenRouterKey)
  const loadingBootstrap = useWorldStore((state) => state.loading.bootstrap)
  const currentWorld = useWorldStore((state) => state.currentWorld)
  const versions = useWorldStore((state) => state.versions)

  const setupRequired = !loadingBootstrap && !hasOpenRouterKey

  return (
    <div className="min-h-screen bg-transparent text-[var(--color-text)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[var(--shell-max-width)] flex-col px-4 py-4 sm:px-6 sm:py-6">
        <header className="shell-panel mb-4 rounded-[2rem] px-5 py-4 xl:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <img
                src={onticMark}
                alt="Ontic"
                className="h-10 w-10 shrink-0 object-contain opacity-95"
              />
              <div className="min-w-0">
                <p className="shell-label">Ontic</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-[var(--color-text)]">
                    {currentWorld ? currentWorld.name : 'No world loaded'}
                  </span>
                  {currentWorld ? (
                    <span className="shell-pill whitespace-nowrap px-3 py-1 text-[11px]">
                      {versions.length} version{versions.length === 1 ? '' : 's'}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <ShellMetric
                label="Access"
                value={hasOpenRouterKey ? 'Parser ready' : 'Setup required'}
              />
              <button
                type="button"
                onClick={() => setCreateWorldOpen(true)}
                className="shell-button-primary whitespace-nowrap px-5 py-2.5 text-sm font-medium"
              >
                Create world
              </button>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="shell-button-secondary whitespace-nowrap px-5 py-2.5 text-sm"
              >
                Settings
              </button>
            </div>
          </div>
        </header>

        {loadingBootstrap ? (
          <div className="shell-card mb-4 rounded-[1.5rem] px-4 py-3 text-sm text-[var(--color-text-muted)]">
            Restoring the last opened world and local settings...
          </div>
        ) : null}

        {setupRequired ? (
          <div className="shell-card mb-4 rounded-[1.5rem] px-4 py-3 text-sm text-[var(--color-text-muted)]">
            LLM-backed flows are blocked until an OpenRouter key is configured. Removing the key does not delete worlds.
          </div>
        ) : null}

        <main className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <GraphCanvas />
          <RightPanel />
        </main>
      </div>

      <CreateWorldModal
        open={createWorldOpen}
        onClose={() => setCreateWorldOpen(false)}
      />

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
    <div className="shell-card rounded-[1.25rem] px-3.5 py-2.5">
      <p className="shell-label text-[0.62rem]">{label}</p>
      <p className="mt-1 whitespace-nowrap text-sm font-medium text-[var(--color-text)]">{value}</p>
    </div>
  )
}
