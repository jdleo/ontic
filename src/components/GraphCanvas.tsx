const graphLegend = [
  { label: 'Actors', tone: 'bg-sky-400' },
  { label: 'Institutions', tone: 'bg-indigo-400' },
  { label: 'Constraints', tone: 'bg-amber-400' },
  { label: 'Outcomes', tone: 'bg-emerald-400' },
]

export function GraphCanvas() {
  return (
    <section className="relative min-h-[540px] overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow)]">
      <div className="absolute inset-0 bg-[linear-gradient(var(--grid)_1px,transparent_1px),linear-gradient(90deg,var(--grid)_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div className="absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top,rgba(103,232,249,0.16),transparent_60%)]" />

      <div className="relative flex h-full min-h-[540px] flex-col">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
              Center Canvas
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">
              Ontology graph surface
            </h2>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {graphLegend.map((item) => (
              <span
                key={item.label}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[rgba(7,17,31,0.72)] px-3 py-1 text-xs text-[var(--muted)]"
              >
                <span className={`size-2 rounded-full ${item.tone}`} />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div className="grid flex-1 place-items-center px-6 py-8">
          <div className="w-full max-w-3xl rounded-[24px] border border-dashed border-[var(--border)] bg-[rgba(6,13,24,0.55)] px-8 py-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent-warm)]">
              Shell Placeholder
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">
              React Flow will mount here
            </h3>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
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
