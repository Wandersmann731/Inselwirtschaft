import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Root } from './Root'
import './index.css'
import './theme.css'
import './motion.css'
import { sprites } from './render/sprites'
import { initLanguage } from './i18n/language'
import { applyMotionSetting } from './save/motion'

async function bootstrap(): Promise<void> {
  // Pictures first: the map is drawn with them. Without them (or while they are missing) it falls back to colour shapes.
  // the loading screen of index.html shows how far it is
  const fill = document.getElementById('boot-fill')
  await sprites.load(undefined, (done, total) => {
    if (fill) fill.style.width = `${Math.round((done / total) * 100)}%`
  })
  initLanguage()
  applyMotionSetting()
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
