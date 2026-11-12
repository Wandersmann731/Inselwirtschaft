import { useEffect, useRef, useState } from 'react'
import { reducedMotion } from '../save/motion'

/** A number that runs to its new value instead of jumping there, e.g. the coins after the taxes came in. */
export function useCountUp(target: number, durationMs = 450): number {
  const [shown, setShown] = useState(target)
  const latest = useRef(target)

  useEffect(() => {
    const from = latest.current
    if (from === target) return
    const still = reducedMotion()
    const start = performance.now()
    let frame = 0
    const step = (now: number): void => {
      const share = still ? 1 : Math.min(1, (now - start) / durationMs)
      latest.current = from + (target - from) * (1 - (1 - share) ** 3)
      setShown(latest.current)
      if (share < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, durationMs])

  return shown
}
