import { useState, type FormEvent } from 'react'
import { useWorldStore } from '../store/useWorldStore'

export function LeftSidebar() {
  const [worldName, setWorldName] = useState('')
  const [scenario, setScenario] = useState('')
  const currentWorld = useWorldStore((state) => state.currentWorld)
  const versions = useWorldStore((state) => state.versions)
  const loadingWorld = useWorldStore((state) => state.loading.world)
  const hasOpenRouterKey = useWorldStore((state) => state.hasOpenRouterKey)
  const worldCreationError = useWorldStore((state) => state.worldCreationError)
  const createWorldFromScenario = useWorldStore((state) => state.createWorldFromScenario)
  const clearWorldCreationError = useWorldStore((state) => state.clearWorldCreationError)

  const submitDisabled = loadingWorld || !hasOpenRouterKey

  const handleCreateWorld = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const created = await createWorldFromScenario({
      name: worldName,
      scenario,
    })

    if (!created) {
      return
    }

    setWorldName('')
    setScenario('')
  }

  return (
    <aside className="shell-panel rounded-[2rem] p-4">
      <div className="shell-card-elevated mb-5 rounded-[1.7rem] px-4 py-4">
        <p className="shell-label">Left Sidebar</p>
        <h2 className="shell-title mt-2">World creation</h2>
        <p className="shell-copy mt-2 text-sm">
          Describe a scenario, validate the extracted ontology, and persist the
          first snapshot before any edits branch forward.
        </p>
      </div>

      <div className="space-y-4">
        <section className="shell-card rounded-[1.5rem] p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="shell-label text-[0.72rem]">Create from text</h3>
            <span className="shell-pill px-3 py-1 text-[11px]">
              {hasOpenRouterKey ? 'Parser ready' : 'Setup required'}
            </span>
          </div>

          <form className="mt-4 space-y-3" onSubmit={handleCreateWorld}>
            <label className="block">
              <span className="shell-copy text-xs uppercase tracking-[0.18em] text-white/55">
                World name
              </span>
              <input
                value={worldName}
                onChange={(event) => {
                  if (worldCreationError) {
                    clearWorldCreationError()
                  }
                  setWorldName(event.target.value)
                }}
                placeholder="Semiconductor export standoff"
                className="mt-2 w-full rounded-[1.15rem] border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
              />
            </label>

            <label className="block">
              <span className="shell-copy text-xs uppercase tracking-[0.18em] text-white/55">
                Scenario
              </span>
              <textarea
                value={scenario}
                onChange={(event) => {
                  if (worldCreationError) {
                    clearWorldCreationError()
                  }
                  setScenario(event.target.value)
                }}
                rows={8}
                placeholder="Describe the actors, constraints, resources, events, and likely outcomes."
                className="mt-2 w-full resize-none rounded-[1.35rem] border border-white/10 bg-black/40 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-white/30"
              />
            </label>

            {worldCreationError ? (
              <div className="rounded-[1.15rem] border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
                {worldCreationError}
              </div>
            ) : null}

            {!hasOpenRouterKey ? (
              <p className="shell-copy text-sm">
                Configure OpenRouter in settings before creating a world.
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitDisabled}
              className="shell-button-primary w-full px-4 py-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loadingWorld ? 'Creating world...' : 'Create world'}
            </button>
          </form>
        </section>

        <section className="shell-card rounded-[1.5rem] p-4">
          <h3 className="shell-label text-[0.72rem]">Current world</h3>
          {currentWorld ? (
            <>
              <h4 className="mt-3 font-[var(--font-family-serif)] text-2xl tracking-[var(--tracking-display)] text-[var(--color-text)]">
                {currentWorld.name}
              </h4>
              <p className="shell-copy mt-3 text-sm">
                {versions.length} version{versions.length === 1 ? '' : 's'} saved locally.
              </p>
              <p className="shell-copy mt-2 text-sm">
                The initial snapshot is preserved and later graph edits branch to
                new versions.
              </p>
            </>
          ) : (
            <p className="shell-copy mt-3 text-sm">
              No world loaded yet. The first successful parse becomes the active
              world and renders on the graph canvas.
            </p>
          )}
        </section>
      </div>
    </aside>
  )
}
