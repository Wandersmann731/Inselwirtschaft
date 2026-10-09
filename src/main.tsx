import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { sprites } from './render/sprites'
import { config } from './data'
import { GameLoop } from './game/gameLoop'
import './index.css'
import { startAutosave } from './save/autosave'
import { loadState } from './save/saveGame'
import { createInitialState } from './sim/state'

async function bootstrap(): Promise<void> {
  // Pictures first: the map is drawn with them. Without them (or while they are missing) it falls back to colour shapes.
  const loadingSprites = sprites.load()
  const saved = await loadState().catch((error) => {
    console.warn('Could not load save, starting a new game', error)
    return null
  })
  await loadingSprites
  const loop = new GameLoop(saved ?? createInitialState(config.startSeed))
  startAutosave(loop)
  loop.start()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App loop={loop} />
    </StrictMode>,
  )
}

void bootstrap()

// Offline mode: the service worker saves the game files. Only in the real build, not while developing.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => console.warn('Offline mode not available', error))
  })
}
