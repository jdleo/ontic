import { type FormEvent, useEffect, useState } from 'react'
import { DEFAULT_GRAPH_PREFERENCES, DEFAULT_MODEL_TIER_CONFIG } from '../store/worldStore'
import { useWorldStore } from '../store/useWorldStore'
import type { GraphPreferences, ModelTierConfig } from '../types'

type SettingsModalProps = {
  open: boolean
  required?: boolean
  onClose: () => void
}

export function SettingsModal({ open, required = false, onClose }: SettingsModalProps) {
  const hasOpenRouterKey = useWorldStore((state) => state.hasOpenRouterKey)
  const modelTierConfig = useWorldStore((state) => state.modelTierConfig)
  const graphPreferences = useWorldStore((state) => state.graphPreferences)
  const loadingBootstrap = useWorldStore((state) => state.loading.bootstrap)
  const setOpenRouterApiKey = useWorldStore((state) => state.setOpenRouterApiKey)
  const removeOpenRouterApiKey = useWorldStore((state) => state.removeOpenRouterApiKey)
  const setModelTierConfig = useWorldStore((state) => state.setModelTierConfig)
  const setGraphPreferences = useWorldStore((state) => state.setGraphPreferences)

  const [apiKeyInput, setApiKeyInput] = useState('')
  const [draftConfig, setDraftConfig] = useState<ModelTierConfig>(modelTierConfig)
  const [draftGraphPreferences, setDraftGraphPreferences] = useState<GraphPreferences>(graphPreferences)

  useEffect(() => {
    setDraftConfig(modelTierConfig)
  }, [modelTierConfig])

  useEffect(() => {
    setDraftGraphPreferences(graphPreferences)
  }, [graphPreferences])

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
    await handleSaveMappings()
    setApiKeyInput('')

    if (!required) {
      onClose()
    }
  }

  async function handleSaveMappings() {
    await Promise.all([
      setModelTierConfig({
        low: draftConfig.low.trim() || DEFAULT_MODEL_TIER_CONFIG.low,
        medium: draftConfig.medium.trim() || DEFAULT_MODEL_TIER_CONFIG.medium,
        high: draftConfig.high.trim() || DEFAULT_MODEL_TIER_CONFIG.high,
      }),
      setGraphPreferences({
        avoidNodeOverlap:
          draftGraphPreferences.avoidNodeOverlap ?? DEFAULT_GRAPH_PREFERENCES.avoidNodeOverlap,
      }),
    ])
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
        required ? 'bg-black/70 backdrop-blur-md' : 'bg-black/55 backdrop-blur-sm'
      }`}
    >
      <div className="shell-panel w-full max-w-3xl rounded-[2rem] px-5 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="shell-label">
              Settings
            </p>
            <h2 className="shell-title mt-3 text-[clamp(1.6rem,1.35rem+0.9vw,2.15rem)]">
              {required ? 'Configure OpenRouter before continuing' : 'Model access and API key'}
            </h2>
            <p className="shell-copy mt-3 max-w-2xl text-sm">
              {required
                ? 'Ontic keeps worlds local, but parsing and explanation flows stay blocked until an OpenRouter key is configured.'
                : 'Manage the stored OpenRouter key and local model-tier routing without affecting saved worlds.'}
            </p>
          </div>

          {!required ? (
            <button
              type="button"
              onClick={onClose}
              className="shell-button-secondary whitespace-nowrap px-4 py-2 text-sm"
            >
              Close
            </button>
          ) : null}
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSave}>
          <section className="shell-card rounded-[1.75rem] px-5 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="shell-label text-[0.68rem]">
                  Key status
                </p>
                <h3 className="mt-2 text-base font-medium tracking-[var(--tracking-tight)] text-[var(--color-text)]">
                  OpenRouter API key
                </h3>
                <p className="shell-copy mt-2 text-sm">
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
                  className="shell-button-secondary whitespace-nowrap px-4 py-2 text-sm"
                >
                  Remove key
                </button>
              ) : null}
            </div>

            <label className="mt-4 block">
              <span className="shell-label text-[0.68rem]">
                {hasOpenRouterKey ? 'Replace key' : 'Add key'}
              </span>
              <input
                value={apiKeyInput}
                onChange={(event) => setApiKeyInput(event.target.value)}
                type="password"
                autoComplete="off"
                placeholder="sk-or-v1-..."
                className="mt-2 w-full rounded-[1.2rem] border border-[var(--color-input)] bg-white/6 px-4 py-3 text-sm text-[var(--color-text)] outline-none transition focus:border-[rgb(255_255_255_/_0.28)]"
              />
            </label>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saveDisabled}
                className="shell-button-primary whitespace-nowrap px-5 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
              >
                {hasOpenRouterKey ? 'Replace key and save settings' : 'Save key and continue'}
              </button>
            </div>
          </section>

          <section className="shell-card rounded-[1.75rem] px-5 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="shell-label text-[0.68rem]">
                  Model routing
                </p>
                <h3 className="mt-2 text-base font-medium tracking-[var(--tracking-tight)] text-[var(--color-text)]">
                  Tier mappings
                </h3>
                <p className="shell-copy mt-2 text-sm">
                  These defaults are stored locally and determine which OpenRouter model each task tier uses.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  void handleSaveMappings()
                }}
                className="shell-button-secondary whitespace-nowrap px-4 py-2 text-sm"
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

          <section className="shell-card rounded-[1.75rem] px-5 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="shell-label text-[0.68rem]">Graph defaults</p>
                <h3 className="mt-2 text-base font-medium tracking-[var(--tracking-tight)] text-[var(--color-text)]">
                  Initial layout
                </h3>
                <p className="shell-copy mt-2 text-sm">
                  Keep new world nodes spread out on creation instead of trusting raw model coordinates.
                </p>
              </div>
            </div>

            <label className="mt-4 flex items-start gap-3 rounded-[1.2rem] border border-[var(--color-border)] bg-white/4 px-4 py-3">
              <input
                type="checkbox"
                checked={draftGraphPreferences.avoidNodeOverlap}
                onChange={(event) =>
                  setDraftGraphPreferences((current) => ({
                    ...current,
                    avoidNodeOverlap: event.target.checked,
                  }))}
                className="mt-1 h-4 w-4 rounded border border-[var(--color-input)] bg-transparent"
              />
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">Avoid node overlap</p>
                <p className="shell-copy mt-1 text-sm">
                  Recommended for generated worlds.
                </p>
              </div>
            </label>
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
      <span className="shell-label text-[0.68rem]">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type="text"
        className="mt-2 w-full rounded-[1.2rem] border border-[var(--color-input)] bg-white/6 px-4 py-3 text-sm text-[var(--color-text)] outline-none transition focus:border-[rgb(255_255_255_/_0.28)]"
      />
    </label>
  )
}
