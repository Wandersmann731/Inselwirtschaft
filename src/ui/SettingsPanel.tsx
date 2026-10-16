import { useState } from 'react'
import { config } from '../data'
import { deleteAllSaves } from '../save/saveGame'
import { audio } from '../audio/engine'
import { getSettings, updateSettings, type Settings } from '../save/settings'
import { applyWakeLock } from './wakeLock'
import { t } from '../i18n/language'
import { LanguageSwitch } from './LanguageSwitch'

interface Props {
  onClose: () => void
  /** Called after all saves were deleted. */
  onDeleted?: () => void
}

type Toggle = 'debug' | 'waterAnimation' | 'smoke' | 'muted' | 'autoFullscreen' | 'vibration' | 'keepAwake'
type Volume = 'volumeEffects' | 'volumeAmbience' | 'volumeMusic'

const VOLUMES: { key: Volume; label: () => string }[] = [
  { key: 'volumeEffects', label: () => t('Effekte', 'Effects') },
  { key: 'volumeAmbience', label: () => t('Umgebung', 'Ambience') },
  { key: 'volumeMusic', label: () => t('Musik', 'Music') },
]

const OPTIONS: { key: Toggle; label: () => string; hint: () => string }[] = [
  { key: 'muted', label: () => t('Ton aus', 'Sound off'), hint: () => t('Schaltet alle Töne stumm.', 'Mutes all sounds.') },
  { key: 'autoFullscreen', label: () => t('Vollbild beim Start', 'Full screen at start'), hint: () => t('Nur auf Handys und Tablets. Im Spiel gibt es dafür auch eine Schaltfläche.', 'Phones and tablets only. There is also a button for it in the game.') },
  { key: 'vibration', label: () => t('Vibration', 'Vibration'), hint: () => t('Kurzes Rütteln beim Bauen, Abreißen und langen Drücken.', 'A short buzz when building, demolishing and on long press.') },
  { key: 'keepAwake', label: () => t('Bildschirm anlassen', 'Keep screen on'), hint: () => t('Das Handy geht während des Spiels nicht in den Ruhezustand.', 'The phone does not go to sleep while you play.') },
  { key: 'waterAnimation', label: () => t('Bewegtes Wasser', 'Moving water'), hint: () => t('Bei langsamen Handys ausschalten.', 'Switch off on slow phones.') },
  { key: 'smoke', label: () => t('Rauch über Schornsteinen', 'Smoke over chimneys'), hint: () => t('Bei langsamen Handys ausschalten.', 'Switch off on slow phones.') },
  { key: 'debug', label: () => t('Entwickleranzeige', 'Developer display'), hint: () => t('Zeigt Bilder pro Sekunde und das Balancing-Fenster.', 'Shows frames per second and the balancing window.') },
]

export function SettingsPanel({ onClose, onDeleted }: Props) {
  const [settings, setSettings] = useState<Settings>({ ...getSettings() })
  const [confirming, setConfirming] = useState(false)

  const toggle = (key: Toggle): void => {
    updateSettings({ [key]: !settings[key] })
    setSettings({ ...getSettings() })
    audio.applySettings()
    applyWakeLock()
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
          <strong>{t('Einstellungen', 'Settings')}</strong>
          <button type="button" className="panel-close" onClick={onClose} aria-label={t('Schließen', 'Close')}>
            ×
          </button>
        </div>
        <div className="stats-scroll">
          <div className="setting-row">
            <span>
              <strong>{t('Sprache', 'Language')}</strong>
              <span className="stats-note setting-hint">{t('Deutsch oder Englisch. Das laufende Spiel bleibt erhalten.', 'German or English. The running game is kept.')}</span>
            </span>
            <LanguageSwitch />
          </div>
          {VOLUMES.map((volume) => (
            <label key={volume.key} className="setting-row">
              <strong>{volume.label()}</strong>
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
                <strong>{option.label()}</strong>
                <span className="stats-note setting-hint">{option.hint()}</span>
              </span>
              <input type="checkbox" checked={settings[option.key]} onChange={() => toggle(option.key)} />
            </label>
          ))}
          <div className="setting-row">
            <span>
              <strong>{t('Alle Spielstände löschen', 'Delete all saved games')}</strong>
              <span className="stats-note setting-hint">{t(`Entfernt den Autospeicher und die ${config.saveSlots} Plätze.`, `Removes the autosave and the ${config.saveSlots} slots.`)}</span>
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
                {t('Wirklich löschen', 'Really delete')}
              </button>
            ) : (
              <button type="button" className="action-button" onClick={() => setConfirming(true)}>
                {t('Löschen', 'Delete')}
              </button>
            )}
          </div>
          <p className="stats-note">{t('Inselwirtschaft läuft ohne Konto und ohne Internet. Alle Daten bleiben auf diesem Gerät.', 'Inselwirtschaft runs without an account and without internet. All data stays on this device.')}</p>
        </div>
      </div>
    </div>
  )
}
