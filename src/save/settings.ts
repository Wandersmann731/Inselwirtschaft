// Player settings, kept in localStorage (not part of a saved game).

export interface Settings {
  /** Shows FPS and map information, and the balancing panel. */
  debug: boolean
  /** Moving water. Switch off on slow phones. */
  waterAnimation: boolean
  /** Smoke over chimneys. */
  smoke: boolean
  /** Volumes from 0 to 1. */
  volumeEffects: number
  volumeAmbience: number
  volumeMusic: number
  muted: boolean
  /** Goes to full screen when a game starts (phones only, the browser needs a tap for it). */
  autoFullscreen: boolean
  /** Short vibration as feedback when something is built or demolished. */
  vibration: boolean
  /** Keeps the screen on while the game is open (Screen Wake Lock, where the browser has it). */
  keepAwake: boolean
  /** Language of the texts in the game. */
  language: 'de' | 'en'
}

/** German if the browser is set to German, English otherwise. Used until the player picks a language. */
function browserLanguage(): 'de' | 'en' {
  const preferred = typeof navigator !== 'undefined' ? (navigator.languages?.[0] ?? navigator.language ?? '') : ''
  return preferred.toLowerCase().startsWith('de') ? 'de' : 'en'
}

const KEY = 'inselwirtschaft:settings'
const DEFAULTS: Settings = {
  debug: false,
  waterAnimation: true,
  smoke: true,
  volumeEffects: 0.8,
  volumeAmbience: 0.6,
  volumeMusic: 0.4,
  muted: false,
  autoFullscreen: true,
  vibration: true,
  keepAwake: true,
  language: browserLanguage(),
}

/** Only what the player chose is saved: the browser language and the ?debug switch stay defaults, not choices. */
function loadStored(): Partial<Settings> {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as Partial<Settings>
  } catch {
    /* private mode or broken data: use the defaults */
  }
  return {}
}

const stored: Partial<Settings> = loadStored()
const current: Settings = { ...DEFAULTS, ...stored }
if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug')) current.debug = true

/** The settings in use. The renderer reads this every frame, so changes show at once. */
export function getSettings(): Readonly<Settings> {
  return current
}

export function updateSettings(change: Partial<Settings>): void {
  Object.assign(current, change)
  Object.assign(stored, change)
  try {
    localStorage.setItem(KEY, JSON.stringify(stored))
  } catch {
    /* cannot save: the change still holds until the page is closed */
  }
}
