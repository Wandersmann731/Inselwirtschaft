import { useState } from 'react'
import { saveState } from '../save/saveGame'
import type { GameLoop } from '../game/gameLoop'
import { toggleFullscreen, useFullscreen } from './fullscreen'
import { SettingsPanel } from './SettingsPanel'
import { SlotList } from './SlotList'
import { useSlots } from './slots'

interface GameMenuProps {
  loop: GameLoop
  onClose: () => void
  /** Saves and goes back to the start screen. */
  onQuit: () => void
}

/** Pause menu inside the game: save into a slot, settings, back to the start screen. */
export function GameMenu({ loop, onClose, onQuit }: GameMenuProps) {
  const [reload, setReload] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [message, setMessage] = useState('')
  const slots = useSlots(reload)
  const fullscreen = useFullscreen()

  const save = (slot: string): void => {
    saveState(loop.getState(), slot)
      .then(() => {
        setMessage('Gespeichert.')
        setReload((value) => value + 1)
      })
      .catch(() => setMessage('Speichern ist fehlgeschlagen.'))
  }

  return (
    <div className="stats-backdrop" onClick={onClose}>
      <div className="stats-panel" onClick={(event) => event.stopPropagation()}>
        <div className="panel-title">
          <strong>Menü</strong>
          <button type="button" className="panel-close" onClick={onClose} aria-label="Schließen">
            ×
          </button>
        </div>
        <div className="stats-scroll">
          <h3>Speichern</h3>
          <SlotList entries={slots} action="Speichern" allowAutosave={false} onChoose={save} />
          {message && <p className="stats-note">{message}</p>}
          <div className="menu-row">
            <button type="button" className="action-button" onClick={() => setShowSettings(true)}>
              Einstellungen
            </button>
            {fullscreen.supported && (
              <button type="button" className="action-button" onClick={() => void toggleFullscreen()}>
                {fullscreen.active ? 'Vollbild beenden' : 'Vollbild'}
              </button>
            )}
            <button type="button" className="action-button" onClick={onQuit}>
              Zum Startbildschirm
            </button>
          </div>
        </div>
      </div>
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  )
}
