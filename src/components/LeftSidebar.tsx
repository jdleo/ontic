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
    <aside className="shell-panel rounded-[2rem] p-4">
      <div className="shell-card-elevated mb-5 rounded-[1.7rem] px-4 py-4">
        <p className="shell-label">
          Left Sidebar
        </p>
        <h2 className="shell-title mt-2">World controls</h2>
        <p className="shell-copy mt-2 text-sm">
          Space for world creation, version history, import/export, and snapshot
          management.
        </p>
      </div>

      <div className="space-y-4">
        {leftRailSections.map((section) => (
          <section
            key={section.title}
            className="shell-card rounded-[1.5rem] p-4"
          >
            <h3 className="shell-label text-[0.72rem]">
              {section.title}
            </h3>
            <ul className="mt-3 space-y-2">
              {section.items.map((item) => (
                <li
                  key={item}
                  className="shell-button-secondary px-3 py-2.5 text-sm"
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
