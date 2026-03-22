const graphLegend = [
  { label: 'Actors', tone: 'bg-white/90' },
  { label: 'Institutions', tone: 'bg-white/65' },
  { label: 'Constraints', tone: 'bg-white/45' },
  { label: 'Outcomes', tone: 'bg-white/30' },
]

export function GraphCanvas() {
  return (
    <section className="shell-panel relative min-h-[540px] overflow-hidden rounded-[2rem]">
      <div className="shell-grid absolute inset-0" />
      <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgb(255_255_255_/_0.08),transparent_58%)]" />

      <div className="relative flex h-full min-h-[540px] flex-col">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <p className="shell-label">
              Center Canvas
            </p>
            <h2 className="shell-title mt-2">
              Ontology graph surface
            </h2>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {graphLegend.map((item) => (
              <span
                key={item.label}
                className="shell-pill inline-flex items-center gap-2 px-3 py-1 text-xs"
              >
                <span className={`size-2 rounded-full ${item.tone}`} />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div className="grid flex-1 place-items-center px-6 py-8">
          <div className="shell-card w-full max-w-3xl rounded-[1.9rem] border-dashed px-8 py-12 text-center">
            <p className="shell-label">
              Shell Placeholder
            </p>
            <h3 className="mt-4 font-[var(--font-family-serif)] text-3xl tracking-[var(--tracking-display)] text-[var(--color-text)]">
              React Flow will mount here
            </h3>
            <p className="shell-copy mx-auto mt-4 max-w-2xl text-sm leading-7">
              This center surface is reserved for the canonical graph editor,
              pan and zoom controls, node inspection hooks, and query context
              highlighting. The shell is in place so those features can land
              without changing layout structure.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
