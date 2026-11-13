import { describe, expect, it } from 'vitest'
import { DOOR } from '../src/render/built/parts'
import { cartShape, FIGURE_SCALE, legAt, WALK_FRAMES, walkFrame } from '../src/render/figures'

describe('people, oxen and carts on the map', () => {
  it('shows every pose of a step once per turn, whatever the game time', () => {
    const seen = new Set<number>()
    for (let k = 0; k < 64; k++) seen.add(walkFrame((k / 64) * Math.PI * 2))
    expect(seen.size).toBe(WALK_FRAMES)
    expect(walkFrame(0)).toBe(0)
    expect(walkFrame(-0.1)).toBe(WALK_FRAMES - 1)
    expect(walkFrame(Math.PI * 2 * 5 + 0.01)).toBe(0)
  })

  it('walks with knees: the leg that comes forward bends and lifts its foot, the standing leg is straight', () => {
    const forward = legAt(0)
    const standing = legAt(Math.PI)
    expect(forward.foot[1]).toBeLessThan(standing.foot[1])
    expect(standing.knee[0]).toBeCloseTo(0)
    expect(standing.foot[0]).toBeCloseTo(0)
    // at the ends of the step one foot is before the body and one behind
    expect(legAt(Math.PI / 2).foot[0]).toBeGreaterThan(1)
    expect(legAt(-Math.PI / 2).foot[0]).toBeLessThan(-1)
    // a leg is never longer than thigh and shin together
    for (let k = 0; k < 16; k++) expect(Math.hypot(...legAt((k / 16) * Math.PI * 2).foot)).toBeLessThanOrEqual(5.71)
  })

  it('keeps the measure of the door: a cart reaches a person to the chest, its wheel is about half a door high', () => {
    for (const big of [true, false]) {
      const cart = cartShape(big)
      expect(-cart.top * FIGURE_SCALE).toBeLessThan(DOOR * 0.7)
      expect(cart.wheel * 2 * FIGURE_SCALE).toBeGreaterThan(DOOR * 0.38)
      expect(cart.wheel * 2 * FIGURE_SCALE).toBeLessThan(DOOR * 0.6)
      expect(cart.floor).toBeLessThan(-cart.wheel)
    }
    expect(cartShape(true).half).toBeGreaterThan(cartShape(false).half)
  })
})
