import { useState } from 'react'
import { config } from '../data'
import { AUTOSAVE_SLOT, loadState } from '../save/saveGame'
import { createInitialState, type GameState } from '../sim/state'
import { Icon } from './Icon'
import { formatWhole } from './messages'
import { SettingsPanel } from './SettingsPanel'
import { SlotList } from './SlotList'
import { useSlots } from './slots'

type Screen = 'main' | 'new' | 'load'

interface MainMenuProps {
  onStart: (state: GameState) => void
}

function randomSeed(): number {
  return 1 + Math.floor(Math.random() * 99999)
}

/** Start screen: continue, new game (seed and start money), load, settings. */
export function MainMenu({ onStart }: MainMenuProps) {
  const [screen, setScreen] = useState<Screen>('main')
  const [showSettings, setShowSettings] = useState(false)
  const [reload, setReload] = useState(0)
  const [seed, setSeed] = useState(String(config.startSeed))
  const [coins, setCoins] = useState(config.startCoins)
  const [message, setMessage] = useState('')
  const slots = useSlots(reload)
  const hasAutosave = slots?.find((entry) => entry.slot === AUTOSAVE_SLOT)?.info != null

  const load = async (slot: string): Promise<void> => {
    try {
      const state = await loadState(slot)
      if (state) onStart(state)
      else setMessage('Dieser Platz ist leer.')
    } catch {
      setMessage('Der Spielstand konnte nicht gelesen werden.')
    }
  }

  const startNew = (): void => {
    const parsed = Math.floor(Number(seed))
    onStart(createInitialState(Number.isFinite(parsed) && parsed > 0 ? parsed : config.startSeed, coins))
  }

  return (
    <div className="menu-screen">
      <div className="menu-panel">
        <img className="menu-logo" src={`${import.meta.env.BASE_URL}sprites/app/logo.webp`} alt="Inselwirtschaft" />
        {screen === 'main' && (
          <div className="menu-buttons">
            <button type="button" className="menu-button primary" disabled={!hasAutosave} onClick={() => void load(AUTOSAVE_SLOT)}>
              Weiterspielen
            </button>
            <button type="button" className="menu-button" onClick={() => setScreen('new')}>
              Neues Spiel
            </button>
            <button type="button" className="menu-button" onClick={() => setScreen('load')}>
              Spielstand laden
            </button>
            <button type="button" className="menu-button" onClick={() => setShowSettings(true)}>
              Einstellungen
            </button>
          </div>
        )}
        {screen === 'new' && (
          <div className="menu-form">
            <label className="menu-field">
              <span>Karten-Startwert (Seed)</span>
              <span className="menu-seed">
                <input inputMode="numeric" value={seed} onChange={(event) => setSeed(event.target.value.replace(/\D/g, '').slice(0, 9))} />
                <button type="button" className="action-button" onClick={() => setSeed(String(randomSeed()))}>
                  Zufall
                </button>
              </span>
              <span className="stats-note">Derselbe Wert ergibt immer dieselben Inseln.</span>
            </label>
            <div className="menu-field">
              <span>Startgeld</span>
              <span className="coin-options">
                {config.startCoinOptions.map((value) => (
                  <button key={value} type="button" className={value === coins ? 'category-button active' : 'category-button'} onClick={() => setCoins(value)}>
                    <Icon name="ui/coin" size={22} />
                    <span>{formatWhole(value)}</span>
                  </button>
                ))}
              </span>
            </div>
            <div className="menu-row">
              <button type="button" className="menu-button" onClick={() => setScreen('main')}>
                Zurück
              </button>
              <button type="button" className="menu-button primary" onClick={startNew}>
                Los geht’s
              </button>
            </div>
          </div>
        )}
        {screen === 'load' && (
          <div className="menu-form">
            <SlotList entries={slots} action="Laden" allowAutosave onChoose={(slot) => void load(slot)} />
            {message && <p className="place-hint invalid">{message}</p>}
            <button type="button" className="menu-button" onClick={() => setScreen('main')}>
              Zurück
            </button>
          </div>
        )}
      </div>
      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          onDeleted={() => setReload((value) => value + 1)}
        />
      )}
    </div>
  )
}
