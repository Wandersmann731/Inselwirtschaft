import { describe, expect, it } from 'vitest'
import { ticksDue } from '../src/sim/clock'

describe('ticksDue', () => {
  it('produces one tick per second at 1x', () => {
    expect(ticksDue(0, 1000, 1, 1000, 20)).toEqual({ ticks: 1, remainderMs: 0 })
  })

  it('runs 2x and 4x faster', () => {
    expect(ticksDue(0, 1000, 2, 1000, 20).ticks).toBe(2)
    expect(ticksDue(0, 1000, 4, 1000, 20).ticks).toBe(4)
  })

  it('produces no ticks while paused', () => {
    expect(ticksDue(500, 5000, 0, 1000, 20)).toEqual({ ticks: 0, remainderMs: 0 })
  })

  it('keeps the remainder for the next update', () => {
    expect(ticksDue(0, 400, 1, 1000, 20)).toEqual({ ticks: 0, remainderMs: 400 })
    expect(ticksDue(400, 700, 1, 1000, 20)).toEqual({ ticks: 1, remainderMs: 100 })
  })

  it('drops surplus time beyond maxTicks', () => {
    expect(ticksDue(0, 60000, 1, 1000, 20)).toEqual({ ticks: 20, remainderMs: 0 })
  })

  it('ignores negative deltas', () => {
    expect(ticksDue(100, -50, 1, 1000, 20)).toEqual({ ticks: 0, remainderMs: 100 })
  })
})
