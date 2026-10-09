import { AUTOSAVE_SLOT } from '../save/saveGame'
import { describe, type SlotEntry } from './slots'

interface SlotListProps {
  entries: SlotEntry[] | null
  /** Label of the action button, for example "Laden" or "Speichern". */
  action: string
  /** The autosave cannot be written by hand. */
  allowAutosave: boolean
  onChoose: (slot: string) => void
}

export function SlotList({ entries, action, allowAutosave, onChoose }: SlotListProps) {
  if (!entries) return <p className="stats-note">Lade …</p>
  return (
    <div className="slot-list">
      {entries.map((entry) => {
        const isAuto = entry.slot === AUTOSAVE_SLOT
        const disabled = (isAuto && !allowAutosave) || (action === 'Laden' && !entry.info)
        return (
          <div key={entry.slot} className="slot-row">
            <div className="slot-text">
              <strong>{entry.label}</strong>
              <span className="stats-note">{describe(entry.info)}</span>
            </div>
            <button type="button" className="action-button" disabled={disabled} onClick={() => onChoose(entry.slot)}>
              {action}
            </button>
          </div>
        )
      })}
    </div>
  )
}
