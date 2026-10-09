import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Root } from './Root'
import './index.css'
import { sprites } from './render/sprites'

async function bootstrap(): Promise<void> {
  // Pictures first: the map is drawn with them. Without them (or while they are missing) it falls back to colour shapes.
  await sprites.load()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Root />
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
