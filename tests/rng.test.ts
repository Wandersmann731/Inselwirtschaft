import { describe, expect, it } from 'vitest'
import { createRng } from '../src/sim/rng'

describe('rng', () => {
  it('returns the same sequence for the same seed', () => {
    const a = createRng(42)
    const b = createRng(42)
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()])
  })

  it('returns different sequences for different seeds', () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next())
  })

  it('stays within [0, 1) and nextInt stays within range', () => {
    const rng = createRng(7)
    for (let i = 0; i < 1000; i++) {
      const value = rng.next()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
      expect(rng.nextInt(10)).toBeLessThan(10)
    }
  })

  it('continues the sequence from a stored state', () => {
    const original = createRng(5)
    original.next()
    const resumed = createRng(original.getState())
    expect(resumed.next()).toBe(original.next())
  })
})
