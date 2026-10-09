import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { config } from './data'
import { GameLoop } from './game/gameLoop'
import './index.css'
import { startAutosave } from './save/autosave'
import { loadState } from './save/saveGame'
import { createInitialState } from './sim/state'

async function bootstrap(): Promise<void> {
  const saved = await loadState().catch((error) => {
    console.warn('Could not load save, starting a new game', error)
    return null
  })
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
