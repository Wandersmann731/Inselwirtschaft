// Player settings, kept in localStorage (not part of a saved game).

export interface Settings {
  /** Shows FPS and map information, and the balancing panel. */
  debug: boolean
  /** Moving water. Switch off on slow phones. */
  waterAnimation: boolean
  /** Smoke over chimneys. */
  smoke: boolean
}

const KEY = 'inselwirtschaft:settings'
const DEFAULTS: Settings = { debug: false, waterAnimation: true, smoke: true }

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    /* private mode or broken data: use the defaults */
  }
  return { ...DEFAULTS }
}

const current: Settings = load()
if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug')) current.debug = true

/** The settings in use. The renderer reads this every frame, so changes show at once. */
export function getSettings(): Readonly<Settings> {
  return current
}

export function updateSettings(change: Partial<Settings>): void {
  Object.assign(current, change)
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    /* cannot save: the change still holds until the page is closed */
  }
}
