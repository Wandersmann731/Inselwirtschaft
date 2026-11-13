import { describe, expect, it } from 'vitest'
import { seaAt } from '../src/render/water'
import { FIGURE_SCALE } from '../src/render/figures'

describe('the sea made from noise', () => {
  it('joins itself at the edges, so the repeating picture has no seam', () => {
    for (const t of [0.13, 0.5, 0.87]) {
      expect(seaAt(0, t).swell).toBeCloseTo(seaAt(1, t).swell, 6)
      expect(seaAt(t, 0).swell).toBeCloseTo(seaAt(t, 1).swell, 6)
      expect(seaAt(0, t).glint).toBeCloseTo(seaAt(1, t).glint, 6)
    }
  })

  it('has light on few places only, and never in a trough', () => {
    let lit = 0
    let total = 0
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const { swell, glint } = seaAt((x + 0.5) / 64, (y + 0.5) / 64)
        expect(swell).toBeGreaterThanOrEqual(0)
        expect(swell).toBeLessThanOrEqual(1)
        if (swell < 0.4) expect(glint).toBe(0)
        if (glint > 0.3) lit++
        total++
      }
    }
    expect(lit).toBeGreaterThan(0)
    expect(lit / total).toBeLessThan(0.12)
  })
})

describe('people on the map', () => {
  it('fit through a house door: a person of 12.5 units is no taller than the 13 world pixels of a door', () => {
    expect(12.5 * FIGURE_SCALE).toBeLessThanOrEqual(13)
    expect(12.5 * FIGURE_SCALE).toBeGreaterThan(10)
  })
})
