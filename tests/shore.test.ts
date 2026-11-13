import { describe, expect, it } from 'vitest'
import { laceAt, rippleAt } from '../src/render/water'

describe('the net of foam behind a wave', () => {
  it('joins itself at the edges, so the repeating picture has no seam', () => {
    for (const t of [0.07, 0.31, 0.5, 0.92]) {
      expect(laceAt(0, t)).toBeCloseTo(laceAt(1, t), 6)
      expect(laceAt(t, 0)).toBeCloseTo(laceAt(t, 1), 6)
    }
  })

  it('is a net: foam in some places, clear water in others, never outside 0 to 1', () => {
    let foam = 0
    let clear = 0
    const total = 96 * 96
    for (let y = 0; y < 96; y++) {
      for (let x = 0; x < 96; x++) {
        const value = laceAt((x + 0.5) / 96, (y + 0.5) / 96)
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(1)
        if (value > 0.6) foam++
        if (value < 0.05) clear++
      }
    }
    expect(foam / total).toBeGreaterThan(0.08)
    expect(foam / total).toBeLessThan(0.5)
    expect(clear / total).toBeGreaterThan(0.2)
  })
})

describe('the small wind waves on the sea', () => {
  it('join themselves at the edges of the repeating picture', () => {
    for (const t of [0.11, 0.48, 0.83]) {
      expect(rippleAt(0, t)).toBeCloseTo(rippleAt(1, t), 6)
      expect(rippleAt(t, 0)).toBeCloseTo(rippleAt(t, 1), 6)
    }
  })

  it('have backs and troughs, between -1 and 1', () => {
    let backs = 0
    let troughs = 0
    for (let y = 0; y < 80; y++) {
      for (let x = 0; x < 80; x++) {
        const value = rippleAt((x + 0.5) / 80, (y + 0.5) / 80)
        expect(value).toBeGreaterThanOrEqual(-1)
        expect(value).toBeLessThanOrEqual(1)
        if (value > 0.2) backs++
        if (value < -0.2) troughs++
      }
    }
    expect(backs).toBeGreaterThan(300)
    expect(troughs).toBeGreaterThan(300)
  })

  it('lie across the screen: they change faster going down than going sideways', () => {
    let across = 0
    let down = 0
    for (let i = 0; i < 400; i++) {
      const u = (i * 0.618) % 1
      const v = (i * 0.381) % 1
      across += Math.abs(rippleAt(u + 0.004, v) - rippleAt(u, v))
      down += Math.abs(rippleAt(u, v + 0.004) - rippleAt(u, v))
    }
    expect(down).toBeGreaterThan(across * 1.5)
  })
})

describe('fresh froth', () => {
  it('is a closer, thicker net than the foam that drifts off, and joins itself too', () => {
    let dense = 0
    let wide = 0
    for (let y = 0; y < 96; y++) {
      for (let x = 0; x < 96; x++) {
        dense += laceAt((x + 0.5) / 96, (y + 0.5) / 96, true)
        wide += laceAt((x + 0.5) / 96, (y + 0.5) / 96)
      }
    }
    expect(dense).toBeGreaterThan(wide * 1.2)
    for (const t of [0.07, 0.5, 0.92]) {
      expect(laceAt(0, t, true)).toBeCloseTo(laceAt(1, t, true), 6)
      expect(laceAt(t, 0, true)).toBeCloseTo(laceAt(t, 1, true), 6)
    }
  })
})
