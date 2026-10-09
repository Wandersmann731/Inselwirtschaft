import { useState } from 'react'
import { config } from '../data'
import { deleteAllSaves } from '../save/saveGame'
import { audio } from '../audio/engine'
import { getSettings, updateSettings, type Settings } from '../save/settings'

interface Props {
  onClose: () => void
  /** Called after all saves were deleted. */
  onDeleted?: () => void
}

type Toggle = 'debug' | 'waterAnimation' | 'smoke' | 'muted' | 'autoFullscreen' | 'vibration'
type Volume = 'volumeEffects' | 'volumeAmbience' | 'volumeMusic'

const VOLUMES: { key: Volume; label: string }[] = [
  { key: 'volumeEffects', label: 'Effekte' },
  { key: 'volumeAmbience', label: 'Umgebung' },
  { key: 'volumeMusic', label: 'Musik' },
]

const OPTIONS: { key: Toggle; label: string; hint: string }[] = [
  { key: 'muted', label: 'Ton aus', hint: 'Schaltet alle Töne stumm.' },
  { key: 'autoFullscreen', label: 'Vollbild beim Start', hint: 'Nur auf Handys und Tablets. Im Spiel gibt es dafür auch eine Schaltfläche.' },
  { key: 'vibration', label: 'Vibration', hint: 'Kurzes Rütteln beim Bauen, Abreißen und langen Drücken.' },
  { key: 'waterAnimation', label: 'Bewegtes Wasser', hint: 'Bei langsamen Handys ausschalten.' },
  { key: 'smoke', label: 'Rauch über Schornsteinen', hint: 'Bei langsamen Handys ausschalten.' },
  { key: 'debug', label: 'Entwickleranzeige', hint: 'Zeigt Bilder pro Sekunde und das Balancing-Fenster.' },
]

export function SettingsPanel({ onClose, onDeleted }: Props) {
  const [settings, setSettings] = useState<Settings>({ ...getSettings() })
  const [confirming, setConfirming] = useState(false)

  const toggle = (key: Toggle): void => {
    updateSettings({ [key]: !settings[key] })
    setSettings({ ...getSettings() })
    audio.applySettings()
  }

  const setVolume = (key: Volume, value: number): void => {
    updateSettings({ [key]: value })
    setSettings({ ...getSettings() })
    audio.applySettings()
  }

  return (
    <div className="stats-backdrop" onClick={onClose}>
      <div className="stats-panel" onClick={(event) => event.stopPropagation()}>
        <div className="panel-title">
          <strong>Einstellungen</strong>
          <button type="button" className="panel-close" onClick={onClose} aria-label="Schließen">
            ×
          </button>
        </div>
        <div className="stats-scroll">
          {VOLUMES.map((volume) => (
            <label key={volume.key} className="setting-row">
              <strong>{volume.label}</strong>
              <input
                type="range"
                className="volume-slider"
                min={0}
                max={1}
                step={0.05}
                value={settings[volume.key]}
                onChange={(event) => setVolume(volume.key, Number(event.target.value))}
              />
            </label>
          ))}
          {OPTIONS.map((option) => (
            <label key={option.key} className="setting-row">
              <span>
                <strong>{option.label}</strong>
                <span className="stats-note setting-hint">{option.hint}</span>
              </span>
              <input type="checkbox" checked={settings[option.key]} onChange={() => toggle(option.key)} />
            </label>
          ))}
          <div className="setting-row">
            <span>
              <strong>Alle Spielstände löschen</strong>
              <span className="stats-note setting-hint">Entfernt den Autospeicher und die {config.saveSlots} Plätze.</span>
            </span>
            {confirming ? (
              <button
                type="button"
                className="action-button danger"
                onClick={() => {
                  void deleteAllSaves(config.saveSlots).then(() => {
                    setConfirming(false)
                    onDeleted?.()
                  })
                }}
              >
                Wirklich löschen
              </button>
            ) : (
              <button type="button" className="action-button" onClick={() => setConfirming(true)}>
                Löschen
              </button>
            )}
          </div>
          <p className="stats-note">Inselwirtschaft läuft ohne Konto und ohne Internet. Alle Daten bleiben auf diesem Gerät.</p>
        </div>
      </div>
    </div>
  )
}
