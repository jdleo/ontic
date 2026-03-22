import { useEffect, useState, type FormEvent } from 'react'
import { useWorldStore } from '../store/useWorldStore'

type CreateWorldModalProps = {
  open: boolean
  onClose: () => void
}

export function CreateWorldModal({ open, onClose }: CreateWorldModalProps) {
  const hasOpenRouterKey = useWorldStore((state) => state.hasOpenRouterKey)
  const loadingWorld = useWorldStore((state) => state.loading.world)
  const worldCreationError = useWorldStore((state) => state.worldCreationError)
  const createWorldFromScenario = useWorldStore((state) => state.createWorldFromScenario)
  const clearWorldCreationError = useWorldStore((state) => state.clearWorldCreationError)

  const [worldName, setWorldName] = useState('')
  const [scenario, setScenario] = useState('')

  useEffect(() => {
    if (!open) {
      setWorldName('')
      setScenario('')
      clearWorldCreationError()
    }
  }, [clearWorldCreationError, open])

  if (!open) {
    return null
  }

  const submitDisabled = loadingWorld || !hasOpenRouterKey

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const created = await createWorldFromScenario({
      name: worldName,
      scenario,
    })

    if (!created) {
      return
    }

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 py-6 backdrop-blur-sm">
      <div className="shell-panel w-full max-w-2xl rounded-[2rem] px-5 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="shell-label">World creation</p>
            <h2 className="shell-title mt-3 text-[clamp(1.6rem,1.35rem+0.9vw,2.15rem)]">
              Create world
            </h2>
            <p className="shell-copy mt-3 max-w-2xl text-sm">
              Parse a scenario into the first saved ontology snapshot. Later graph edits will branch from that initial version.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shell-button-secondary whitespace-nowrap px-4 py-2 text-sm"
          >
            Close
          </button>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <section className="shell-card rounded-[1.75rem] px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <p className="shell-label text-[0.68rem]">Scenario input</p>
              <span className="shell-pill shrink-0 whitespace-nowrap px-3 py-1 text-[11px]">
                {hasOpenRouterKey ? 'Parser ready' : 'Setup required'}
              </span>
            </div>

            <label className="mt-4 block">
              <span className="shell-label text-[0.68rem]">World name</span>
              <input
                value={worldName}
                onChange={(event) => {
                  if (worldCreationError) {
                    clearWorldCreationError()
                  }
                  setWorldName(event.target.value)
                }}
                placeholder="Semiconductor export standoff"
                className="mt-2 w-full rounded-[1.2rem] border border-[var(--color-input)] bg-white/6 px-4 py-3 text-sm text-[var(--color-text)] outline-none transition focus:border-[rgb(255_255_255_/_0.28)]"
              />
            </label>

            <label className="mt-4 block">
              <span className="shell-label text-[0.68rem]">Scenario</span>
              <textarea
                value={scenario}
                onChange={(event) => {
                  if (worldCreationError) {
                    clearWorldCreationError()
                  }
                  setScenario(event.target.value)
                }}
                rows={9}
                placeholder="Describe the actors, constraints, resources, events, and likely outcomes."
                className="mt-2 w-full resize-none rounded-[1.2rem] border border-[var(--color-input)] bg-white/6 px-4 py-3 text-sm leading-6 text-[var(--color-text)] outline-none transition focus:border-[rgb(255_255_255_/_0.28)]"
              />
            </label>

            {worldCreationError ? (
              <div className="mt-4 rounded-[1.15rem] border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
                {worldCreationError}
              </div>
            ) : null}

            {!hasOpenRouterKey ? (
              <p className="shell-copy mt-4 text-sm">
                Configure OpenRouter in settings before creating a world.
              </p>
            ) : null}

            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                disabled={submitDisabled}
                className="shell-button-primary whitespace-nowrap px-5 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingWorld ? 'Creating world...' : 'Create world'}
              </button>
            </div>
          </section>
        </form>
      </div>
    </div>
  )
}
