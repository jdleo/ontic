import { PanelCard } from './QueryPanel'
import { useWorldStore } from '../store/useWorldStore'

export function MutationPanel() {
  const hasOpenRouterKey = useWorldStore((state) => state.hasOpenRouterKey)

  return (
    <PanelCard
      eyebrow="Mutate"
      title="Intervention drafting"
      body={
        hasOpenRouterKey
          ? 'Ontology patch entry, validation feedback, and version creation controls belong in this panel.'
          : 'Mutation parsing stays blocked until an OpenRouter key is configured in Settings.'
      }
    />
  )
}
