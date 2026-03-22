import { InspectPanel } from './InspectPanel'
import { MutationPanel } from './MutationPanel'
import { QueryPanel } from './QueryPanel'
import { ResultsPanel } from './ResultsPanel'
import { useWorldStore } from '../store/useWorldStore'

export function RightPanel() {
  const hasOpenRouterKey = useWorldStore((state) => state.hasOpenRouterKey)

  return (
    <aside className="flex min-h-[540px] flex-col gap-4 rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-4 shadow-[var(--shadow)]">
      <div className="rounded-[24px] border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
          Right Panel
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">
          Query, mutate, inspect, results
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          The feature panels are stubbed in the final layout so workflows can be
          built independently.
        </p>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Status: {hasOpenRouterKey ? 'LLM settings configured' : 'Waiting for OpenRouter setup'}
        </p>
      </div>

      <div className="grid min-h-0 flex-1 gap-4">
        <QueryPanel />
        <MutationPanel />
        <InspectPanel />
        <ResultsPanel />
      </div>
    </aside>
  )
}
