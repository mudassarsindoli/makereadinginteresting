import { useEffect, useRef } from 'react'
import { DEFAULT_PREFS } from '../lib/storage.js'
import { ENVIRONMENTS, ENVIRONMENT_IDS } from '../lib/environments.js'

const FONT_SIZES = [
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'large', label: 'Large' },
]

const SPACINGS = [
  { id: 'small', label: 'Compact' },
  { id: 'medium', label: 'Medium' },
  { id: 'large', label: 'Relaxed' },
]

export default function SettingsPanel({ open, prefs, setPrefs, onClose }) {
  const fileRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  function onCustomImage(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setPrefs((p) => ({ ...p, environment: 'custom', customImage: String(reader.result) }))
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Reading settings">
      <button
        type="button"
        aria-label="Dismiss settings"
        onClick={onClose}
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
      />
      <div className="acrylic relative w-full max-w-md rounded-2xl border border-line px-6 py-6 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted hover:text-ink hover:bg-line/60 transition-colors"
            aria-label="Close settings"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <fieldset className="mb-6">
          <legend className="mb-2 text-sm font-medium">Environment</legend>
          <div className="grid grid-cols-2 gap-2">
            {ENVIRONMENT_IDS.filter((id) => id !== 'custom').map((id) => {
              const env = ENVIRONMENTS[id]
              const active = prefs.environment === id
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setPrefs((p) => ({ ...p, environment: id }))}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                    active ? 'border-accent bg-accent/10 font-medium' : 'border-line hover:bg-line/40'
                  }`}
                >
                  <span
                    className="inline-flex h-5 w-5 overflow-hidden rounded-full border border-line"
                    aria-hidden="true"
                  >
                    {env.swatch.map((c, i) => (
                      <span key={i} className="h-full w-1/3" style={{ backgroundColor: c }} />
                    ))}
                  </span>
                  {env.label}
                </button>
              )
            })}
            <button
              type="button"
              aria-pressed={prefs.environment === 'custom'}
              onClick={() => fileRef.current?.click()}
              className={`col-span-2 flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                prefs.environment === 'custom'
                  ? 'border-accent bg-accent/10 font-medium'
                  : 'border-line hover:bg-line/40'
              }`}
            >
              {prefs.environment === 'custom' && prefs.customImage
                ? 'Custom image — tap to change'
                : 'Upload custom image'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onCustomImage}
              className="sr-only"
              tabIndex={-1}
            />
          </div>
        </fieldset>

        <fieldset className="mb-6">
          <legend className="mb-2 text-sm font-medium">Font size</legend>
          <div className="segmented grid grid-cols-3" role="group">
            {FONT_SIZES.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={prefs.fontSize === f.id}
                onClick={() => setPrefs((p) => ({ ...p, fontSize: f.id }))}
              >
                {f.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mb-6">
          <legend className="mb-2 text-sm font-medium">Spacing</legend>
          <div className="segmented grid grid-cols-3" role="group">
            {SPACINGS.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={prefs.spacing === s.id}
                onClick={() => setPrefs((p) => ({ ...p, spacing: s.id }))}
              >
                {s.label}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="button"
          onClick={() => setPrefs({ ...DEFAULT_PREFS })}
          className="text-sm text-muted underline underline-offset-4 hover:text-ink"
        >
          Reset to defaults
        </button>
      </div>
    </div>
  )
}
