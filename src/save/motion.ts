import { getSettings } from './settings'

/** True if the player or the system asked for less movement: no slides, no count-ups, no effects on the map. */
export function reducedMotion(): boolean {
  if (getSettings().reducedMotion) return true
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Marks the page, so the style sheet can switch its animations off (see motion.css). */
export function applyMotionSetting(): void {
  document.documentElement.classList.toggle('reduce-motion', getSettings().reducedMotion)
}
