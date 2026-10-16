import { useState } from 'react'
import { saveState } from '../save/saveGame'
import type { GameLoop } from '../game/gameLoop'
import { toggleFullscreen, useFullscreen } from './fullscreen'
import { SettingsPanel } from './SettingsPanel'
import { SlotList } from './SlotList'
import { useSlots } from './slots'
import { t } from '../i18n/language'

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
        setMessage(t('Gespeichert.', 'Saved.'))
        setReload((value) => value + 1)
      })
      .catch(() => setMessage(t('Speichern ist fehlgeschlagen.', 'Saving failed.')))
  }

  return (
    <div className="stats-backdrop" onClick={onClose}>
      <div className="stats-panel" onClick={(event) => event.stopPropagation()}>
        <div className="panel-title">
          <strong>{t('Menü', 'Menu')}</strong>
          <button type="button" className="panel-close" onClick={onClose} aria-label={t('Schließen', 'Close')}>
            ×
          </button>
        </div>
        <div className="stats-scroll">
          <h3>{t('Speichern', 'Save')}</h3>
          <SlotList entries={slots} action={t('Speichern', 'Save')} allowAutosave={false} onChoose={save} />
          {message && <p className="stats-note">{message}</p>}
          <div className="menu-row">
            <button type="button" className="action-button" onClick={() => setShowSettings(true)}>
              {t('Einstellungen', 'Settings')}
            </button>
            {fullscreen.supported && (
              <button type="button" className="action-button" onClick={() => void toggleFullscreen()}>
                {fullscreen.active ? t('Vollbild beenden', 'Exit full screen') : t('Vollbild', 'Full screen')}
              </button>
            )}
            <button type="button" className="action-button" onClick={onQuit}>
              {t('Zum Startbildschirm', 'To the start screen')}
            </button>
          </div>
        </div>
      </div>
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  )
}
