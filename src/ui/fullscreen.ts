import { useEffect, useState } from 'react'

/** True if the browser can show the page in full screen (not on iPhones; an installed app is full screen anyway). */
export function fullscreenSupported(): boolean {
  return typeof document !== 'undefined' && document.fullscreenEnabled === true
}

/** True on phones and tablets (touch as the main input). */
export function isTouchDevice(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
}

/** True if the game already fills the screen, as an installed app. */
function isInstalledApp(): boolean {
  return window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches
}

export function inFullscreen(): boolean {
  return document.fullscreenElement !== null
}

/** Enters or leaves full screen. Must be called from a tap or click. Failures are ignored. */
export async function toggleFullscreen(): Promise<void> {
  try {
    if (inFullscreen()) await document.exitFullscreen()
    else await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
  } catch {
    /* the browser refused (no tap, or not allowed): stay as we are */
  }
}

/** Goes to full screen on phones if it is not already, from the tap that starts a game. */
export function enterFullscreenOnPhone(): void {
  if (!fullscreenSupported() || !isTouchDevice() || isInstalledApp() || inFullscreen()) return
  void toggleFullscreen()
}

/** Follows the full screen state of the page. */
export function useFullscreen(): { supported: boolean; active: boolean } {
  const [active, setActive] = useState(() => typeof document !== 'undefined' && inFullscreen())
  useEffect(() => {
    const update = (): void => setActive(inFullscreen())
    document.addEventListener('fullscreenchange', update)
    return () => document.removeEventListener('fullscreenchange', update)
  }, [])
  return { supported: fullscreenSupported() && !isInstalledApp(), active }
}
