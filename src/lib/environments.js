const LEAF_PATTERN =
  "url(\"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22160%22%20height%3D%22160%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%230d3b24%22%20stroke-opacity%3D%220.09%22%20stroke-width%3D%221.6%22%20stroke-linecap%3D%22round%22%3E%3Cpath%20d%3D%22M28%20118c2-26%2022-46%2048-48%22%2F%3E%3Cpath%20d%3D%22M76%2070c-12%204-24%201-33-8%22%2F%3E%3Cpath%20d%3D%22M76%2070c3-12%2013-20%2025-22%22%2F%3E%3Cpath%20d%3D%22M104%2038c1%2018%2014%2031%2032%2031%22%2F%3E%3Cpath%20d%3D%22M136%2069c-8-2-16%200-21%206%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E\") 0 0 / 160px 160px repeat"

const STAR_PATTERN =
  "url(\"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22200%22%20height%3D%22200%22%20viewBox%3D%220%200%20200%20200%22%3E%3Cg%20fill%3D%22%23ffffff%22%3E%3Ccircle%20cx%3D%2218%22%20cy%3D%2224%22%20r%3D%221%22%2F%3E%3Ccircle%20cx%3D%2272%22%20cy%3D%2212%22%20r%3D%220.8%22%2F%3E%3Ccircle%20cx%3D%22130%22%20cy%3D%2230%22%20r%3D%221.2%22%2F%3E%3Ccircle%20cx%3D%22178%22%20cy%3D%2266%22%20r%3D%220.7%22%2F%3E%3Ccircle%20cx%3D%2244%22%20cy%3D%2286%22%20r%3D%220.9%22%2F%3E%3Ccircle%20cx%3D%22108%22%20cy%3D%22104%22%20r%3D%221.1%22%2F%3E%3Ccircle%20cx%3D%2226%22%20cy%3D%22150%22%20r%3D%220.7%22%2F%3E%3Ccircle%20cx%3D%2282%22%20cy%3D%22176%22%20r%3D%221%22%2F%3E%3Ccircle%20cx%3D%22150%22%20cy%3D%22140%22%20r%3D%220.8%22%2F%3E%3Ccircle%20cx%3D%22186%22%20cy%3D%22182%22%20r%3D%221.1%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E\") 0 0 / 220px 220px repeat"

const GRID_PATTERN =
  "url(\"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%220%200%2040%2040%22%3E%3Cpath%20d%3D%22M40%200H0v40%22%20fill%3D%22none%22%20stroke%3D%22%2367e8f9%22%20stroke-opacity%3D%220.1%22%20stroke-width%3D%221%22%2F%3E%3C%2Fsvg%3E\") 0 0 / 40px 40px repeat"

const CUSTOM_SCRIM = 'linear-gradient(rgba(8, 12, 18, 0.72), rgba(8, 12, 18, 0.82))'

export const ENVIRONMENT_IDS = ['nature', 'space', 'technology', 'custom']

export const DEFAULT_ENVIRONMENT = 'nature'

export const ENVIRONMENTS = {
  nature: {
    id: 'nature',
    label: 'Nature',
    description: 'Airy forest light with leaf greens and soft daylight.',
    scheme: 'light',
    accent: '#2f7d4f',
    accentInk: '#ffffff',
    surface: 'rgba(255, 255, 255, 0.72)',
    surface2: 'rgba(238, 248, 240, 0.82)',
    ink: '#14261a',
    muted: '#4f6b59',
    line: 'rgba(20, 62, 38, 0.14)',
    backdrop: [
      'radial-gradient(1100px 760px at 10% -12%, rgba(198, 240, 209, 0.9), transparent 62%)',
      'radial-gradient(900px 700px at 100% 4%, rgba(180, 224, 255, 0.5), transparent 58%)',
      LEAF_PATTERN,
      'linear-gradient(165deg, #f4fbf5 0%, #e8f3ea 55%, #dfeef0 100%)',
    ].join(', '),
    cover: [
      'radial-gradient(120% 120% at 85% 10%, rgba(255, 255, 255, 0.7), transparent 55%)',
      LEAF_PATTERN,
      'linear-gradient(150deg, #cdebd4 0%, #8fcaa4 45%, #4e9a6b 100%)',
    ].join(', '),
    swatch: ['#e8f3ea', '#2f7d4f', '#14261a'],
  },
  space: {
    id: 'space',
    label: 'Space',
    description: 'Deep navy and violet starfield with a calm night glow.',
    scheme: 'dark',
    accent: '#a78bfa',
    accentInk: '#0b0f2a',
    surface: 'rgba(18, 22, 48, 0.62)',
    surface2: 'rgba(28, 32, 64, 0.72)',
    ink: '#e9ecff',
    muted: '#a7add6',
    line: 'rgba(233, 236, 255, 0.14)',
    backdrop: [
      'radial-gradient(900px 700px at 18% 8%, rgba(124, 108, 240, 0.35), transparent 60%)',
      'radial-gradient(1000px 800px at 82% 0%, rgba(64, 120, 220, 0.3), transparent 62%)',
      'radial-gradient(800px 600px at 50% 110%, rgba(168, 85, 247, 0.22), transparent 60%)',
      STAR_PATTERN,
      'linear-gradient(165deg, #070a1e 0%, #0d1230 55%, #120c2c 100%)',
    ].join(', '),
    cover: [
      'radial-gradient(90% 90% at 80% 20%, rgba(140, 120, 255, 0.5), transparent 60%)',
      STAR_PATTERN,
      'linear-gradient(155deg, #101638 0%, #1b1f52 45%, #2a1a5e 100%)',
    ].join(', '),
    swatch: ['#0d1230', '#a78bfa', '#e9ecff'],
  },
  technology: {
    id: 'technology',
    label: 'Technology',
    description: 'Slate panels with cyan grid lines and a subtle circuit glow.',
    scheme: 'dark',
    accent: '#22d3ee',
    accentInk: '#04141a',
    surface: 'rgba(15, 23, 32, 0.66)',
    surface2: 'rgba(22, 33, 45, 0.76)',
    ink: '#e6f6fb',
    muted: '#93a9b8',
    line: 'rgba(230, 246, 251, 0.14)',
    backdrop: [
      'radial-gradient(900px 650px at 12% 0%, rgba(34, 211, 238, 0.22), transparent 60%)',
      'radial-gradient(800px 700px at 90% 10%, rgba(56, 189, 248, 0.18), transparent 58%)',
      GRID_PATTERN,
      'linear-gradient(165deg, #0a121a 0%, #0d1822 55%, #0b1a24 100%)',
    ].join(', '),
    cover: [
      'radial-gradient(100% 100% at 80% 15%, rgba(34, 211, 238, 0.45), transparent 60%)',
      GRID_PATTERN,
      'linear-gradient(150deg, #0e1c26 0%, #123243 45%, #0a4a5c 100%)',
    ].join(', '),
    swatch: ['#0d1822', '#22d3ee', '#e6f6fb'],
  },
  custom: {
    id: 'custom',
    label: 'Custom',
    description: 'Your own image behind a neutral Fluent-blue scrim.',
    scheme: 'dark',
    accent: '#0078d4',
    accentInk: '#ffffff',
    surface: 'rgba(19, 22, 28, 0.66)',
    surface2: 'rgba(28, 32, 40, 0.76)',
    ink: '#f2f4f7',
    muted: '#a8b0bb',
    line: 'rgba(242, 244, 247, 0.14)',
    backdrop: [
      'radial-gradient(900px 700px at 15% 0%, rgba(0, 120, 212, 0.16), transparent 60%)',
      'linear-gradient(165deg, #0b0d11 0%, #11151c 55%, #0c1016 100%)',
    ].join(', '),
    cover: [
      'radial-gradient(100% 100% at 80% 15%, rgba(0, 120, 212, 0.35), transparent 62%)',
      'linear-gradient(150deg, #101419 0%, #18202b 50%, #0f1720 100%)',
    ].join(', '),
    swatch: ['#11151c', '#0078d4', '#f2f4f7'],
  },
}

export function getEnvironment(id) {
  return ENVIRONMENTS[id] || ENVIRONMENTS[DEFAULT_ENVIRONMENT]
}

export function environmentStyle(id) {
  const env = getEnvironment(id)
  return {
    '--rd-base': env.swatch[0],
    '--rd-surface': env.surface,
    '--rd-surface-2': env.surface2,
    '--rd-ink': env.ink,
    '--rd-muted': env.muted,
    '--rd-line': env.line,
    '--rd-accent': env.accent,
    '--rd-accent-ink': env.accentInk,
    'color-scheme': env.scheme,
  }
}

export function backdropFor(id, customImage) {
  const env = getEnvironment(id)
  if (env.id === 'custom' && customImage) {
    return `${CUSTOM_SCRIM}, url("${customImage}") center / cover no-repeat`
  }
  return env.backdrop
}

export function coverFor(id, customImage) {
  const env = getEnvironment(id)
  if (env.id === 'custom' && customImage) {
    return `${CUSTOM_SCRIM}, url("${customImage}") center / cover no-repeat`
  }
  return env.cover
}
