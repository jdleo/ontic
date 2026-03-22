const leftRailSections = [
  {
    title: 'Worlds',
    items: ['Create new world', 'Restore last world', 'Import JSON'],
  },
  {
    title: 'Versions',
    items: ['Snapshot timeline', 'Branch from version', 'Export current world'],
  },
]

export function LeftSidebar() {
  return (
    <aside className="rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-4 shadow-[var(--shadow)]">
      <div className="mb-5 rounded-[24px] border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
          Left Sidebar
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">World controls</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Space for world creation, version history, import/export, and snapshot
          management.
        </p>
      </div>

      <div className="space-y-4">
        {leftRailSections.map((section) => (
          <section
            key={section.title}
            className="rounded-[22px] border border-[var(--border)] bg-[rgba(7,17,31,0.62)] p-4"
          >
            <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              {section.title}
            </h3>
            <ul className="mt-3 space-y-2">
              {section.items.map((item) => (
                <li
                  key={item}
                  className="rounded-2xl border border-[var(--border)] bg-[rgba(14,26,45,0.72)] px-3 py-2 text-sm text-white"
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </aside>
  )
}
