export interface TicksDue {
  ticks: number
  remainderMs: number
}

/**
 * Fixed-timestep accumulator. Converts elapsed real time into whole ticks.
 * At speed 0 nothing accumulates. If more than maxTicks are due (e.g. after the tab
 * was in the background) the surplus is dropped instead of simulated.
 */
export function ticksDue(
  accumulatorMs: number,
  deltaMs: number,
  speed: number,
  tickMillis: number,
  maxTicks: number,
): TicksDue {
  if (speed <= 0) return { ticks: 0, remainderMs: 0 }
  const intervalMs = tickMillis / speed
  const totalMs = accumulatorMs + Math.max(0, deltaMs)
  const due = Math.floor(totalMs / intervalMs)
  if (due > maxTicks) return { ticks: maxTicks, remainderMs: 0 }
  return { ticks: due, remainderMs: totalMs - due * intervalMs }
}
