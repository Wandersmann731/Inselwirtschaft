import { describe, expect, it } from 'vitest'
import { rippleAt, swellAt, waveLight } from '../src/render/water'
import { FIGURE_SCALE } from '../src/render/figures'

describe('the sea made from noise', () => {
  it('joins itself at the edges, so the repeating picture has no seam', () => {
    for (const t of [0.13, 0.5, 0.87]) {
      expect(swellAt(0, t)).toBeCloseTo(swellAt(1, t), 6)
      expect(swellAt(t, 0)).toBeCloseTo(swellAt(t, 1), 6)
      expect(swellAt(t, 0.3)).toBeGreaterThanOrEqual(0)
      expect(swellAt(t, 0.3)).toBeLessThanOrEqual(1)
      expect(rippleAt(0, t)).toBeCloseTo(rippleAt(1, t), 6)
      expect(rippleAt(t, 0)).toBeCloseTo(rippleAt(t, 1), 6)
    }
  })

  it('is lit by its waves: a crest is light, a flank that falls towards the viewer is dark', () => {
    expect(waveLight(0.9, 0)).toBeGreaterThan(0.5)
    expect(waveLight(-0.6, 0)).toBeLessThan(0)
    // the same height is lighter where it falls towards the light
    expect(waveLight(0.3, 0.2)).toBeGreaterThan(waveLight(0.3, -0.2))
    for (const height of [-1, -0.3, 0, 0.4, 1]) {
      for (const fall of [-1, 0, 1]) {
        expect(waveLight(height, fall)).toBeGreaterThanOrEqual(-1)
        expect(waveLight(height, fall)).toBeLessThanOrEqual(1)
      }
    }
  })

  it('has no flat grey sea: most of it is neither the lightest nor the darkest water', () => {
    let light = 0
    let dark = 0
    const total = 80 * 80
    for (let y = 0; y < 80; y++) {
      for (let x = 0; x < 80; x++) {
        const value = waveLight(rippleAt((x + 0.5) / 80, (y + 0.5) / 80), 0)
        if (value > 0.35) light++
        if (value < -0.15) dark++
      }
    }
    expect(light / total).toBeGreaterThan(0.02)
    expect(light / total).toBeLessThan(0.4)
    expect(dark / total).toBeGreaterThan(0.05)
  })
})

describe('people on the map', () => {
  it('fit through a house door: a person of 12.5 units is no taller than the 13 world pixels of a door', () => {
    expect(12.5 * FIGURE_SCALE).toBeLessThanOrEqual(13)
    expect(12.5 * FIGURE_SCALE).toBeGreaterThan(10)
  })
})
