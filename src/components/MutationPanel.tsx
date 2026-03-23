import { PanelCard } from './QueryPanel'
import { useWorldStore } from '../store/useWorldStore'

export function MutationPanel() {
  const hasOpenRouterKey = useWorldStore((state) => state.hasOpenRouterKey)
  const currentWorld = useWorldStore((state) => state.currentWorld)
  const activeMutationInput = useWorldStore((state) => state.activeMutationInput)
  const loadingMutation = useWorldStore((state) => state.loading.mutation)
  const workerJob = useWorldStore((state) => state.workerJob)
  const setActiveMutationInput = useWorldStore((state) => state.setActiveMutationInput)
  const submitMutation = useWorldStore((state) => state.submitMutation)

  if (!currentWorld) {
    return (
      <PanelCard
        eyebrow="Mutate"
        title="Intervention drafting"
        body="Create or load a world before applying interventions."
      />
    )
  }

  if (!hasOpenRouterKey) {
    return (
      <PanelCard
        eyebrow="Mutate"
        title="Intervention drafting"
        body="Mutation parsing stays blocked until an OpenRouter key is configured in Settings."
      />
    )
  }

  return (
    <section className="shell-card rounded-[1.5rem] p-4">
      <p className="shell-label text-[0.7rem]">Mutate</p>
      <h3 className="mt-2 text-base font-medium tracking-[var(--tracking-tight)] text-[var(--color-text)]">
        Intervention drafting
      </h3>
      <textarea
        value={activeMutationInput}
        onChange={(event) => setActiveMutationInput(event.target.value)}
        rows={4}
        placeholder="Country A launches missile strikes against Country B's logistics hubs."
        className="mt-3 w-full resize-none rounded-[1rem] border border-white/12 bg-white/6 px-3 py-2 text-sm text-white outline-none"
      />
      {workerJob.state === 'error' && workerJob.task === 'mutation' ? (
        <p className="mt-3 text-sm text-red-200">{workerJob.message}</p>
      ) : null}
      <button
        type="button"
        onClick={() => void submitMutation(activeMutationInput)}
        disabled={loadingMutation || !activeMutationInput.trim()}
        className="shell-button-primary mt-3 w-full px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loadingMutation ? 'Applying mutation...' : 'Apply intervention'}
      </button>
    </section>
  )
}
