import { InspectPanel } from './InspectPanel'
import { MutationPanel } from './MutationPanel'
import { QueryPanel } from './QueryPanel'
import { ResultsPanel } from './ResultsPanel'
import { useWorldStore } from '../store/useWorldStore'

export function RightPanel() {
  const hasOpenRouterKey = useWorldStore((state) => state.hasOpenRouterKey)

  return (
    <aside className="shell-panel flex min-h-[540px] flex-col gap-4 rounded-[2rem] p-4">
      <div className="shell-card-elevated rounded-[1.7rem] px-4 py-4">
        <p className="shell-label">
          Right Panel
        </p>
        <h2 className="shell-title mt-2">
          Query, mutate, inspect, results
        </h2>
        <p className="shell-copy mt-2 text-sm">
          The feature panels are stubbed in the final layout so workflows can be
          built independently.
        </p>
        <p className="shell-copy mt-3 text-sm">
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
