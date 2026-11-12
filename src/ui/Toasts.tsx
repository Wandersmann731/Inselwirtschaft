import { useEffect, useRef, useState } from 'react'
import { islandName } from '../i18n/dataNames'
import { config } from '../data'
import { toIslandState } from '../sim/islands'
import type { GameState } from '../sim/state'
import { findShortages } from '../sim/warnings'
import { shortageText } from './messages'
import { Icon } from './Icon'
import { t } from '../i18n/language'
import { audio } from '../audio/engine'
import type { TutorialStep } from '../data'
import { getSettings } from '../save/settings'
import { currentHint, isHintMet } from '../sim/tutorial'
import { hintText } from './hintTexts'

interface Toast {
  id: number
  text: string
  /** A reached goal is good news and looks different from a warning. */
  good?: boolean
}

const SHOW_MS = 6000

/** Short messages at the top: a good about to run out, coins below zero. Checked once per cycle. */
export function Toasts({ state }: { state: GameState }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const warned = useRef(new Set<string>())
  const wasInDebt = useRef(false)
  const nextId = useRef(1)
  const timers = useRef(new Set<number>())

  const push = (text: string, good = false): void => {
    const id = nextId.current++
    setToasts((current) => [...current, { id, text, good }])
    const timer = window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
      timers.current.delete(timer)
    }, SHOW_MS)
    timers.current.add(timer)
  }

  const cycleIndex = Math.floor(state.tick / config.economyCycleTicks)
  useEffect(() => {
    const owned = state.islands.filter((island) => island.owned)
    const now = new Set<string>()
    for (const island of owned) {
      for (const warning of findShortages(toIslandState(state, island.id))) {
        const key = `${island.id}:${warning.good}`
        now.add(key)
        if (!warned.current.has(key)) {
          const text = shortageText(warning.good, warning.cycles)
          push(owned.length > 1 ? `${islandName(island.name)}: ${text}` : text)
        }
      }
    }
    warned.current = now

    const inDebt = state.coins < 0
    if (inDebt && !wasInDebt.current) push(t('Münzen im Minus: Neubauten sind gesperrt', 'Coins below zero: new buildings are blocked'))
    wasInDebt.current = inDebt
    // Only re-check when a cycle was settled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleIndex])

  // A reached goal: a short note and a sound, a fanfare when the last goal of a tier is through. Skipped goals stay quiet.
  const step = getSettings().hints ? currentHint(state) : null
  const stepId = step?.id ?? null
  const shown = useRef<TutorialStep | null>(step)
  useEffect(() => {
    const previous = shown.current
    shown.current = step
    if (!previous || previous.id === stepId || !isHintMet(state, previous)) return
    push(t(`Ziel erreicht: ${hintText(previous.id).title}`, `Goal reached: ${hintText(previous.id).title}`), true)
    audio.play(step?.tier === previous.tier ? 'ui_confirm' : 'music_stinger_win')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((timer) => window.clearTimeout(timer))
  }, [])

  if (toasts.length === 0) return null
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={toast.good ? 'toast good' : 'toast'}>
          {toast.good ? <span aria-hidden="true">✓</span> : <Icon name="ui/warning" size={24} />} {toast.text}
        </div>
      ))}
    </div>
  )
}
