import { useEffect, useState } from 'react'
import { config } from '../data'
import { AUTOSAVE_SLOT, loadSaveInfo, manualSlots, type SaveInfo } from '../save/saveGame'
import { formatWhole } from './messages'
import { numberLocale, t } from '../i18n/language'

export interface SlotEntry {
  slot: string
  label: string
  info: SaveInfo | null
}

const SLOT_NAMES = [AUTOSAVE_SLOT, ...manualSlots(config.saveSlots)]

/** Reads what is in the autosave and the manual slots. `reload` changes when something was saved. */
export function useSlots(reload: number): SlotEntry[] | null {
  const [entries, setEntries] = useState<SlotEntry[] | null>(null)
  useEffect(() => {
    let cancelled = false
    Promise.all(SLOT_NAMES.map((slot) => loadSaveInfo(slot))).then((infos) => {
      if (cancelled) return
      setEntries(
        SLOT_NAMES.map((slot, i) => ({
          slot,
          label: slot === AUTOSAVE_SLOT ? t('Automatisch gespeichert', 'Autosave') : t(`Platz ${i}`, `Slot ${i}`),
          info: infos[i],
        })),
      )
    })
    return () => {
      cancelled = true
    }
  }, [reload])
  return entries
}

function when(savedAt: number): string {
  return new Date(savedAt).toLocaleString(numberLocale(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function describe(info: SaveInfo | null): string {
  if (!info) return t('leer', 'empty')
  const minutes = Math.floor(info.tick / 60)
  return t(
    `${formatWhole(info.residents)} Einwohner · ${formatWhole(info.coins)} Münzen · ${minutes} Min. gespielt · ${when(info.savedAt)}`,
    `${formatWhole(info.residents)} residents · ${formatWhole(info.coins)} coins · ${minutes} min played · ${when(info.savedAt)}`,
  )
}

