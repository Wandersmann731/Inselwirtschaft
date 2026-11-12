import { useEffect, useRef } from 'react'
import { config } from '../data'
import type { GameLoop } from '../game/gameLoop'
import type { MapRenderer } from '../render/mapRenderer'
import type { GameSpeed } from '../sim/state'

/** Pixels the map moves for one press of an arrow key. */
const PAN_STEP = 96

const PAN: Record<string, [number, number]> = {
  arrowleft: [PAN_STEP, 0],
  a: [PAN_STEP, 0],
  arrowright: [-PAN_STEP, 0],
  d: [-PAN_STEP, 0],
  arrowup: [0, PAN_STEP],
  w: [0, PAN_STEP],
  arrowdown: [0, -PAN_STEP],
  s: [0, -PAN_STEP],
}

interface Keys {
  loop: GameLoop
  getRenderer: () => MapRenderer | null
  /** Closes the open window or drops the build tool. */
  onEscape: () => void
}

/**
 * Keys for playing at a desk: space pauses and goes on, 1 to 3 set the speed, the arrow keys (or W A S D) move the
 * map, Escape closes the open window or drops the build tool. Typing in a field is left alone.
 */
export function useKeyboard({ loop, getRenderer, onEscape }: Keys): void {
  const lastSpeed = useRef<GameSpeed>(config.defaultSpeed as GameSpeed)
  const escape = useRef(onEscape)
  useEffect(() => {
    escape.current = onEscape
  })

  // the speed to go back to after a pause, however the game was paused
  useEffect(
    () =>
      loop.subscribe(() => {
        const speed = loop.getState().speed
        if (speed > 0) lastSpeed.current = speed
      }),
    [loop],
  )

  useEffect(() => {
    const running = config.speeds.filter((speed) => speed > 0) as GameSpeed[]
    const onKey = (event: KeyboardEvent): void => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) return
      const key = event.key.toLowerCase()
      if (key === ' ') {
        // a focused button would be pressed by the space bar as well
        if (target instanceof HTMLButtonElement) target.blur()
        const speed = loop.getState().speed
        loop.setSpeed(speed === 0 ? lastSpeed.current : 0)
      } else if (/^[1-9]$/.test(key) && running[Number(key) - 1] !== undefined) {
        loop.setSpeed(running[Number(key) - 1])
      } else if (key === 'escape') {
        escape.current()
      } else if (PAN[key]) {
        getRenderer()?.panBy(PAN[key][0], PAN[key][1])
      } else {
        return
      }
      event.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [loop, getRenderer])
}
