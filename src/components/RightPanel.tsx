import { InspectPanel } from './InspectPanel'
import { MutationPanel } from './MutationPanel'
import { QueryPanel } from './QueryPanel'
import { ResultsPanel } from './ResultsPanel'
import { VersionHistoryPanel } from './VersionHistoryPanel'

export function RightPanel() {
  return (
    <aside className="shell-panel self-start rounded-[2rem] p-4">
      <div className="grid gap-4">
        <QueryPanel />
        <ResultsPanel />
        <MutationPanel />
        <InspectPanel />
        <VersionHistoryPanel />
      </div>
    </aside>
  )
}
