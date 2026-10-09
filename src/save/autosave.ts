import { config } from '../data'
import type { GameLoop } from '../game/gameLoop'
import { saveState } from './saveGame'

/** Saves right now into the autosave slot. */
export function saveNow(loop: GameLoop): Promise<void> {
  return saveState(loop.getState())
}

function save(loop: GameLoop): void {
  saveState(loop.getState()).catch((error) => console.error('Autosave failed', error))
}

/** Saves every config.autosaveSeconds and whenever the page gets hidden. Returns a cleanup function. */
export function startAutosave(loop: GameLoop): () => void {
  const timer = window.setInterval(() => save(loop), config.autosaveSeconds * 1000)
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') save(loop)
  }
  document.addEventListener('visibilitychange', onVisibilityChange)
  return () => {
    window.clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
}
