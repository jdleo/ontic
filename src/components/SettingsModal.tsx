export function SettingsModal() {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 hidden xl:block">
      <div className="rounded-2xl border border-[var(--border)] bg-[rgba(5,12,23,0.78)] px-4 py-3 text-right shadow-[var(--shadow)] backdrop-blur">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
          Settings Host
        </p>
        <p className="mt-2 max-w-xs text-sm text-[var(--muted)]">
          Blocking key setup and model-tier preferences will attach here in the
          next layer of work.
        </p>
      </div>
    </div>
  )
}
