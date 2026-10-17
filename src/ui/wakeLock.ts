import { getSettings } from '../save/settings'

// Keeps the screen on while playing. The browser drops the lock whenever the page is hidden, so it is asked for
// again when the page comes back. Browsers without the Wake Lock API simply keep their normal behaviour.

interface WakeLockSentinelLike {
  released: boolean
  release(): Promise<void>
}

let sentinel: WakeLockSentinelLike | null = null
let listening = false
/** True while a game is on screen; the start screen lets the display turn off. */
let inGame = false
/** A request is under way: do not ask twice (a second lock would never be released). */
let requesting = false

function wakeLockApi(): { request(type: 'screen'): Promise<WakeLockSentinelLike> } | null {
  const nav = navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> } }
  return nav.wakeLock ?? null
}

/** The game screen calls this when it opens (true) and closes (false). */
export function setWakeLockActive(active: boolean): void {
  inGame = active
  applyWakeLock()
}

/** Takes or releases the screen lock to match the setting. Safe to call often. */
export function applyWakeLock(): void {
  const api = wakeLockApi()
  if (!api) return
  if (!listening) {
    listening = true
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') applyWakeLock()
    })
  }
  const wanted = inGame && getSettings().keepAwake && document.visibilityState === 'visible'
  if (wanted && !requesting && (!sentinel || sentinel.released)) {
    requesting = true
    api.request('screen').then(
      (lock) => {
        requesting = false
        // the game was left or the setting switched off while the request was pending
        if (!inGame || !getSettings().keepAwake) return void lock.release()
        sentinel = lock
      },
      () => {
        requesting = false
        /* not allowed right now (e.g. battery saver): try again on the next visit */
      },
    )
  } else if (!wanted && sentinel && !sentinel.released) {
    void sentinel.release()
    sentinel = null
  }
}
