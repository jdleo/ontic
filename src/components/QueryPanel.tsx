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
