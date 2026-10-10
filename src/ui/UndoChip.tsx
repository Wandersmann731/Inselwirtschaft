import { useEffect, useState } from 'react'
import { UNDO_MS, type BuildController, type UndoEntry } from '../game/buildController'

/**
 * Button just above the bottom bar to take the last build action back for its full cost. Disappears after a
 * few seconds. Sits low on the screen, where the thumb is.
 */
/** Distance from the bottom of the screen to just above the bottom bar, which changes its height (menus, placing). */
function aboveBar(): number {
  const bar = document.querySelector('.build-menu, .place-bar')
  return bar ? window.innerHeight - bar.getBoundingClientRect().top + 8 : 140
}

export function UndoChip({ tool, entry }: { tool: BuildController; entry: UndoEntry }) {
  const [now, setNow] = useState(() => performance.now())
  const [bottom, setBottom] = useState(aboveBar)
  const left = Math.max(0, Math.ceil((UNDO_MS - (now - entry.at)) / 1000))

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(performance.now())
      setBottom(aboveBar())
    }, 250)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (left <= 0) tool.dropUndo()
  }, [left, tool])

  if (left <= 0) return null
  return (
    <button type="button" className="undo-chip" style={{ bottom }} onClick={() => tool.undo()}>
      <span aria-hidden="true">↶</span> Rückgängig: {entry.label} <small>{left} s</small>
    </button>
  )
}
