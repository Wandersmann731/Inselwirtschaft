import { getSettings } from '../save/settings'

// Keeps the screen on while playing. The browser drops the lock whenever the page is hidden, so it is asked for
// again when the page comes back. Browsers without the Wake Lock API simply keep their normal behaviour.

interface WakeLockSentinelLike {
  released: boolean
  release(): Promise<void>
}

let sentinel: WakeLockSentinelLike | null = null
let listening = false

function wakeLockApi(): { request(type: 'screen'): Promise<WakeLockSentinelLike> } | null {
  const nav = navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinelLike> } }
  return nav.wakeLock ?? null
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
  const wanted = getSettings().keepAwake && document.visibilityState === 'visible'
  if (wanted && (!sentinel || sentinel.released)) {
    api.request('screen').then(
      (lock) => {
        sentinel = lock
      },
      () => {
        /* not allowed right now (e.g. battery saver): try again on the next visit */
      },
    )
  } else if (!wanted && sentinel && !sentinel.released) {
    void sentinel.release()
    sentinel = null
  }
}
