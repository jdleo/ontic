import { useWorldStore } from '../store/useWorldStore'

export function QueryPanel() {
  const hasOpenRouterKey = useWorldStore((state) => state.hasOpenRouterKey)

  return (
    <PanelCard
      eyebrow="Query"
      title="Natural-language questions"
      body={
        hasOpenRouterKey
          ? 'Structured query parsing and subgraph selection will live here.'
          : 'Configure OpenRouter in Settings to enable structured query parsing and explanation flows.'
      }
    />
  )
}

type PanelCardProps = {
  eyebrow: string
  title: string
  body: string
}

export function PanelCard({ eyebrow, title, body }: PanelCardProps) {
  return (
    <section className="rounded-[22px] border border-[var(--border)] bg-[rgba(7,17,31,0.62)] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--accent-warm)]">
        {eyebrow}
      </p>
      <h3 className="mt-2 text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-[var(--muted)]">{body}</p>
    </section>
  )
}
