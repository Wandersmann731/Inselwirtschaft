import { useState } from 'react'
import { config } from '../data'
import { deleteAllSaves } from '../save/saveGame'
import { getSettings, updateSettings, type Settings } from '../save/settings'

interface Props {
  onClose: () => void
  /** Called after all saves were deleted. */
  onDeleted?: () => void
}

const OPTIONS: { key: keyof Settings; label: string; hint: string }[] = [
  { key: 'waterAnimation', label: 'Bewegtes Wasser', hint: 'Bei langsamen Handys ausschalten.' },
  { key: 'smoke', label: 'Rauch über Schornsteinen', hint: 'Bei langsamen Handys ausschalten.' },
  { key: 'debug', label: 'Entwickleranzeige', hint: 'Zeigt Bilder pro Sekunde und das Balancing-Fenster.' },
]

export function SettingsPanel({ onClose, onDeleted }: Props) {
  const [settings, setSettings] = useState<Settings>({ ...getSettings() })
  const [confirming, setConfirming] = useState(false)

  const toggle = (key: keyof Settings): void => {
    updateSettings({ [key]: !settings[key] })
    setSettings({ ...getSettings() })
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
