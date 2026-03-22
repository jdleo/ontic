import { useWorldStore } from '../store/useWorldStore'

export function QueryPanel() {
  const hasOpenRouterKey = useWorldStore((state) => state.hasOpenRouterKey)
  const currentWorld = useWorldStore((state) => state.currentWorld)
  const activeQueryInput = useWorldStore((state) => state.activeQueryInput)
  const loadingQuery = useWorldStore((state) => state.loading.query)
  const workerJob = useWorldStore((state) => state.workerJob)
  const setActiveQueryInput = useWorldStore((state) => state.setActiveQueryInput)
  const submitQuery = useWorldStore((state) => state.submitQuery)

  if (!currentWorld) {
    return (
      <PanelCard
        eyebrow="Query"
        title="Natural-language questions"
        body="Create or load a world before running a query."
      />
    )
  }

  if (!hasOpenRouterKey) {
    return (
      <PanelCard
        eyebrow="Query"
        title="Natural-language questions"
        body="Configure OpenRouter in Settings to enable structured query parsing and explanation flows."
      />
    )
  }

  return (
    <section className="shell-card rounded-[1.5rem] p-4">
      <p className="shell-label text-[0.7rem]">Query</p>
      <h3 className="mt-2 text-base font-medium tracking-[var(--tracking-tight)] text-[var(--color-text)]">
        Natural-language questions
      </h3>
      <textarea
        value={activeQueryInput}
        onChange={(event) => setActiveQueryInput(event.target.value)}
        rows={4}
        placeholder="What is most likely to happen over the next 90 days?"
        className="mt-3 w-full resize-none rounded-[1rem] border border-white/12 bg-white/6 px-3 py-2 text-sm text-white outline-none"
      />
      {workerJob.state === 'error' && workerJob.task === 'query' ? (
        <p className="mt-3 text-sm text-red-200">{workerJob.message}</p>
      ) : null}
      <button
        type="button"
        onClick={() => void submitQuery(activeQueryInput)}
        disabled={loadingQuery || !activeQueryInput.trim()}
        className="shell-button-primary mt-3 w-full px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loadingQuery ? 'Running query...' : 'Run query'}
      </button>
    </section>
  )
}

type PanelCardProps = {
  eyebrow: string
  title: string
  body: string
}

export function PanelCard({ eyebrow, title, body }: PanelCardProps) {
  return (
    <section className="shell-card rounded-[1.5rem] p-4">
      <p className="shell-label text-[0.7rem]">
        {eyebrow}
      </p>
      <h3 className="mt-2 text-base font-medium tracking-[var(--tracking-tight)] text-[var(--color-text)]">
        {title}
      </h3>
      <p className="shell-copy mt-2 text-sm">{body}</p>
    </section>
  )
}
