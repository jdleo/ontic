export function SettingsModal() {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 hidden xl:block">
      <div className="shell-card rounded-[1.5rem] px-4 py-3 text-right">
        <p className="shell-label text-[0.68rem]">
          Settings Host
        </p>
        <p className="shell-copy mt-2 max-w-xs text-sm">
          Blocking key setup and model-tier preferences will attach here in the
          next layer of work.
        </p>
      </div>
    </div>
  )
}
