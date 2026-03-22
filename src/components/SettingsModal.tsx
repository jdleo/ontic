import { type FormEvent, useEffect, useState } from 'react'
import { DEFAULT_MODEL_TIER_CONFIG } from '../store/worldStore'
import { useWorldStore } from '../store/useWorldStore'
import type { ModelTierConfig } from '../types'

type SettingsModalProps = {
  open: boolean
  required?: boolean
  onClose: () => void
}

export function SettingsModal({ open, required = false, onClose }: SettingsModalProps) {
  const hasOpenRouterKey = useWorldStore((state) => state.hasOpenRouterKey)
  const modelTierConfig = useWorldStore((state) => state.modelTierConfig)
  const loadingBootstrap = useWorldStore((state) => state.loading.bootstrap)
  const setOpenRouterApiKey = useWorldStore((state) => state.setOpenRouterApiKey)
  const removeOpenRouterApiKey = useWorldStore((state) => state.removeOpenRouterApiKey)
  const setModelTierConfig = useWorldStore((state) => state.setModelTierConfig)

  const [apiKeyInput, setApiKeyInput] = useState('')
  const [draftConfig, setDraftConfig] = useState<ModelTierConfig>(modelTierConfig)

  useEffect(() => {
    setDraftConfig(modelTierConfig)
  }, [modelTierConfig])

  if (!open && !required) {
    return null
  }

  const saveDisabled = loadingBootstrap || apiKeyInput.trim().length === 0

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (saveDisabled) {
      return
    }

    setOpenRouterApiKey(apiKeyInput.trim())
    await setModelTierConfig({
      low: draftConfig.low.trim() || DEFAULT_MODEL_TIER_CONFIG.low,
      medium: draftConfig.medium.trim() || DEFAULT_MODEL_TIER_CONFIG.medium,
      high: draftConfig.high.trim() || DEFAULT_MODEL_TIER_CONFIG.high,
    })
    setApiKeyInput('')

    if (!required) {
      onClose()
    }
  }

  async function handleSaveMappings() {
    await setModelTierConfig({
      low: draftConfig.low.trim() || DEFAULT_MODEL_TIER_CONFIG.low,
      medium: draftConfig.medium.trim() || DEFAULT_MODEL_TIER_CONFIG.medium,
      high: draftConfig.high.trim() || DEFAULT_MODEL_TIER_CONFIG.high,
    })
  }

  async function handleRemoveKey() {
    removeOpenRouterApiKey()
    setApiKeyInput('')

    if (!required) {
      await handleSaveMappings()
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center px-4 py-6 ${
        required ? 'bg-[rgba(2,8,20,0.84)] backdrop-blur-md' : 'bg-[rgba(2,8,20,0.58)] backdrop-blur-sm'
      }`}
    >
      <div className="w-full max-w-2xl rounded-[28px] border border-[var(--border)] bg-[var(--panel-strong)] p-6 shadow-[var(--shadow)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
              Settings
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
              {required ? 'Configure OpenRouter before continuing' : 'Model access and API key'}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted)]">
              {required
                ? 'Ontic keeps worlds locally, but parsing and explanation flows stay blocked until an OpenRouter key is configured.'
                : 'Manage local model routing and replace or remove the stored OpenRouter key without touching saved worlds.'}
            </p>
          </div>

          {!required ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-white"
            >
              Close
            </button>
          ) : null}
        </div>

        <form className="mt-6 space-y-6" onSubmit={handleSave}>
          <section className="rounded-[24px] border border-[var(--border)] bg-[var(--panel)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-white">OpenRouter API key</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Status: {hasOpenRouterKey ? 'Configured as sk-or-v1-••••••••' : 'Missing'}
                </p>
              </div>

              {hasOpenRouterKey ? (
                <button
                  type="button"
                  onClick={() => {
                    setApiKeyInput('')
                    void handleRemoveKey()
                  }}
                  className="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] transition hover:border-[var(--accent-warm)] hover:text-white"
                >
                  Remove key
                </button>
              ) : null}
            </div>

            <label className="mt-4 block">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                {hasOpenRouterKey ? 'Replace key' : 'Add key'}
              </span>
              <input
                value={apiKeyInput}
                onChange={(event) => setApiKeyInput(event.target.value)}
                type="password"
                autoComplete="off"
                placeholder="sk-or-v1-..."
                className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[rgba(4,10,20,0.72)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
              />
            </label>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saveDisabled}
                className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[#03111f] transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {hasOpenRouterKey ? 'Replace key and save settings' : 'Save key and continue'}
              </button>
            </div>
          </section>

          <section className="rounded-[24px] border border-[var(--border)] bg-[var(--panel)] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-white">Model tier routing</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  These mappings are persisted locally and control which OpenRouter model each task tier uses.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  void handleSaveMappings()
                }}
                className="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-white"
              >
                Save mappings
              </button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <TierInput
                label="Light"
                value={draftConfig.low}
                onChange={(value) => setDraftConfig((current) => ({ ...current, low: value }))}
              />
              <TierInput
                label="Medium"
                value={draftConfig.medium}
                onChange={(value) => setDraftConfig((current) => ({ ...current, medium: value }))}
              />
              <TierInput
                label="Heavy"
                value={draftConfig.high}
                onChange={(value) => setDraftConfig((current) => ({ ...current, high: value }))}
              />
            </div>
          </section>
        </form>
      </div>
    </div>
  )
}

type TierInputProps = {
  label: string
  value: string
  onChange: (value: string) => void
}

function TierInput({ label, value, onChange }: TierInputProps) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type="text"
        className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[rgba(4,10,20,0.72)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--accent)]"
      />
    </label>
  )
}
