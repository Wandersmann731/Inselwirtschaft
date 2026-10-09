import { useEffect, useRef, useState } from 'react'
import { config } from '../data'
import { toIslandState } from '../sim/islands'
import type { GameState } from '../sim/state'
import { findShortages } from '../sim/warnings'
import { shortageText } from './messages'
import { Icon } from './Icon'

interface Toast {
  id: number
  text: string
}

const SHOW_MS = 6000

/** Short messages at the top: a good about to run out, coins below zero. Checked once per cycle. */
export function Toasts({ state }: { state: GameState }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const warned = useRef(new Set<string>())
  const wasInDebt = useRef(false)
  const nextId = useRef(1)
  const timers = useRef(new Set<number>())

  const push = (text: string): void => {
    const id = nextId.current++
    setToasts((current) => [...current, { id, text }])
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
          push(owned.length > 1 ? `${island.name}: ${text}` : text)
        }
      }
    }
    warned.current = now

    const inDebt = state.coins < 0
    if (inDebt && !wasInDebt.current) push('Münzen im Minus: Neubauten sind gesperrt')
    wasInDebt.current = inDebt
    // Only re-check when a cycle was settled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleIndex])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((timer) => window.clearTimeout(timer))
  }, [])

  if (toasts.length === 0) return null
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast">
          <Icon name="ui/warning" size={24} /> {toast.text}
        </div>
      ))}
    </div>
  )
}
