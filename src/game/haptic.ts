import { getSettings } from '../save/settings'

/** A short vibration as feedback on the phone (built, demolished, long press). Does nothing where it is not supported. */
export function haptic(ms = 12): void {
  if (!getSettings().vibration) return
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* not allowed here */
  }
}
