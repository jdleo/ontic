import { InspectPanel } from './InspectPanel'
import { MutationPanel } from './MutationPanel'
import { QueryPanel } from './QueryPanel'
import { ResultsPanel } from './ResultsPanel'
import { VersionHistoryPanel } from './VersionHistoryPanel'

export function RightPanel() {
  return (
    <aside className="shell-panel flex min-h-[540px] flex-col gap-4 rounded-[2rem] p-4">
      <div className="grid min-h-0 flex-1 gap-4">
        <VersionHistoryPanel />
        <QueryPanel />
        <MutationPanel />
        <InspectPanel />
        <ResultsPanel />
      </div>
    </aside>
  )
}
