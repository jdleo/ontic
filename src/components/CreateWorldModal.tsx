import { useState, type FormEvent } from 'react'
import { useWorldStore } from '../store/useWorldStore'

type CreateWorldModalProps = {
  open: boolean
  onClose: () => void
}

export function CreateWorldModal({ open, onClose }: CreateWorldModalProps) {
  const hasOpenRouterKey = useWorldStore((state) => state.hasOpenRouterKey)
  const loadingWorld = useWorldStore((state) => state.loading.world)
  const worldCreationError = useWorldStore((state) => state.worldCreationError)
  const worldCreationDebug = useWorldStore((state) => state.worldCreationDebug)
  const createWorldFromScenario = useWorldStore((state) => state.createWorldFromScenario)
  const clearWorldCreationError = useWorldStore((state) => state.clearWorldCreationError)

  const [worldName, setWorldName] = useState('')
  const [scenario, setScenario] = useState('')
  const [researchTopic, setResearchTopic] = useState('')
  const [researchOpen, setResearchOpen] = useState(false)
  const [normalizeAndRepair, setNormalizeAndRepair] = useState(true)

  if (!open) {
    return null
  }

  const submitDisabled = loadingWorld || !hasOpenRouterKey

  const researchPrompt = buildRealtimeResearchPrompt(researchTopic)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const created = await createWorldFromScenario({
      name: worldName,
      scenario,
      normalizeAndRepair,
    })

    if (!created) {
      return
    }

    onClose()
  }

  function handleClose() {
    setWorldName('')
    setScenario('')
    setResearchTopic('')
    setResearchOpen(false)
    setNormalizeAndRepair(true)
    clearWorldCreationError()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 px-4 py-6 backdrop-blur-sm">
      <div className="flex min-h-full items-start justify-center">
      <div className="shell-panel my-auto w-full max-w-2xl rounded-[2rem] px-5 py-5 sm:px-6">
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
            onClick={handleClose}
            className="shell-button-secondary whitespace-nowrap px-4 py-2 text-sm"
          >
            Close
          </button>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <section className="shell-card rounded-[1.75rem] px-5 py-5">
            <button
              type="button"
              onClick={() => setResearchOpen((current) => !current)}
              className="flex w-full items-start justify-between gap-4 text-left"
            >
              <div>
                <p className="shell-label text-[0.68rem]">Realtime research</p>
                <h3 className="mt-2 text-base font-medium tracking-[var(--tracking-tight)] text-[var(--color-text)]">
                  Generate a search prompt
                </h3>
                <p className="shell-copy mt-2 text-sm">
                  Optional. Use this when the world depends on current events and you want a clean prompt for ChatGPT, Claude, or Perplexity.
                </p>
              </div>
              <span className="shell-pill shrink-0 whitespace-nowrap px-3 py-1 text-[11px]">
                {researchOpen ? 'Hide' : 'Show'}
              </span>
            </button>

            {researchOpen ? (
              <>
                <label className="mt-4 block">
                  <span className="shell-label text-[0.68rem]">What should the world be about?</span>
                  <input
                    value={researchTopic}
                    onChange={(event) => setResearchTopic(event.target.value)}
                    placeholder="Current AI chip export restrictions affecting China"
                    className="mt-2 w-full rounded-[1.2rem] border border-[var(--color-input)] bg-white/6 px-4 py-3 text-sm text-[var(--color-text)] outline-none transition focus:border-[rgb(255_255_255_/_0.28)]"
                  />
                </label>

                <label className="mt-4 block">
                  <span className="shell-label text-[0.68rem]">Prompt to paste elsewhere</span>
                  <textarea
                    readOnly
                    value={researchPrompt}
                    rows={9}
                    className="mt-2 w-full resize-none rounded-[1.2rem] border border-[var(--color-input)] bg-white/6 px-4 py-3 font-[var(--font-family-mono)] text-sm leading-6 text-[var(--color-text)] outline-none"
                  />
                </label>
              </>
            ) : null}
          </section>

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

            <label className="mt-4 flex items-start gap-3 rounded-[1rem] border border-white/8 bg-white/4 px-4 py-3 text-sm text-white/78">
              <input
                type="checkbox"
                checked={normalizeAndRepair}
                onChange={(event) => setNormalizeAndRepair(event.target.checked)}
                className="mt-0.5"
              />
              <span>
                Run normalization and repair after parsing.
                <span className="mt-1 block text-xs text-white/56">
                  Optional medium-tier cleanup that merges obvious duplicates, normalizes relations, and records a cleanup summary.
                </span>
              </span>
            </label>

            {worldCreationError ? (
              <div className="mt-4 rounded-[1.15rem] border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
                <p>{worldCreationError}</p>
                {worldCreationDebug ? (
                  <p className="mt-2 break-words font-[var(--font-family-mono)] text-xs text-red-100/85">
                    {worldCreationDebug}
                  </p>
                ) : null}
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
    </div>
  )
}

function buildRealtimeResearchPrompt(topic: string) {
  const cleanedTopic = topic.trim()

  if (!cleanedTopic) {
    return [
      'Use realtime web search to gather the latest facts, actors, constraints, incentives, dependencies, and likely outcomes for the topic I provide.',
      'Then write a concise scenario description suitable for generating a causal world model.',
      '',
      'Include:',
      '- major actors and institutions',
      '- key resources, events, and constraints',
      '- the most important causal links',
      '- near-term and medium-term outcomes',
      '- any important uncertainty or assumptions',
      '',
      'Return the result as plain English scenario text, not JSON.',
      '',
      'Topic: [replace with topic]',
    ].join('\n')
  }

  return [
    'Use realtime web search to gather the latest information about this topic and synthesize it into scenario text for a causal world model.',
    '',
    `Topic: ${cleanedTopic}`,
    '',
    'Instructions:',
    '- use current/recent sources, not background knowledge alone',
    '- identify the main actors, institutions, resources, events, constraints, and incentives',
    '- focus on the clearest causal relationships and tensions',
    '- include both immediate effects and likely downstream outcomes',
    '- call out major uncertainties or disputed facts',
    '',
    'Output format:',
    '- one tight scenario summary in plain English',
    '- no JSON',
    '- no bullets unless necessary',
    '- write it so it can be pasted directly into a world-generation tool',
  ].join('\n')
}
