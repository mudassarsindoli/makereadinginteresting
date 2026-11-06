import { ENVIRONMENT_IDS, DEFAULT_ENVIRONMENT } from './environments.js'

const PREFS_KEY = 'Yeezypdf:prefs'
const POSITIONS_KEY = 'Yeezypdf:positions'

const FONT_SIZES = ['small', 'medium', 'large']
const SPACINGS = ['small', 'medium', 'large']
const MAX_CUSTOM_IMAGE_CHARS = 4_500_000

export const DEFAULT_PREFS = {
  environment: DEFAULT_ENVIRONMENT,
  customImage: null,
  fontSize: 'medium',
  spacing: 'medium',
}

export function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return { ...DEFAULT_PREFS }
    const parsed = JSON.parse(raw)
    const environment = ENVIRONMENT_IDS.includes(parsed.environment)
      ? parsed.environment
      : DEFAULT_PREFS.environment
    const fontSize = FONT_SIZES.includes(parsed.fontSize)
      ? parsed.fontSize
      : DEFAULT_PREFS.fontSize
    const spacing = SPACINGS.includes(parsed.spacing)
      ? parsed.spacing
      : DEFAULT_PREFS.spacing
    const customImage =
      typeof parsed.customImage === 'string' &&
      parsed.customImage.length <= MAX_CUSTOM_IMAGE_CHARS
        ? parsed.customImage
        : null
    return { environment, customImage, fontSize, spacing }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

export function savePrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    /* storage unavailable or quota exceeded (large custom image) */
  }
}

export function docKey(file) {
  return `${file.name}::${file.size}`
}

function readPositions() {
  try {
    const raw = localStorage.getItem(POSITIONS_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function loadPosition(key) {
  return readPositions()[key] || null
}

export function savePosition(key, { name, cardIndex, totalCards }) {
  try {
    const all = readPositions()
    const total = Math.max(1, totalCards || 1)
    const index = Math.max(0, Math.min(total - 1, cardIndex || 0))
    all[key] = {
      name,
      cardIndex: index,
      totalCards: total,
      progress: total > 1 ? index / (total - 1) : 0,
      updatedAt: Date.now(),
    }
    localStorage.setItem(POSITIONS_KEY, JSON.stringify(all))
  } catch {
    /* quota exceeded or storage unavailable */
  }
}

export function mostRecentPosition() {
  const all = Object.entries(readPositions())
  if (!all.length) return null
  all.sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0))
  const [key, value] = all[0]
  return { key, ...value }
}
