import { describe, expect, it } from 'vitest'
import { GROWN, grown } from '../src/render/grown'
import { faceLight, massifHeight } from '../src/render/grown/stones'
import { boughEnds, outOf } from '../src/render/grown/canopy'
import { firReach } from '../src/render/grown/conifer'
import { numbers } from '../src/render/grown/paint'
import { lightUnder, SUN } from '../src/render/grown/volume'
import { sectorFor } from '../src/render/shipRenderer'
import { puffAt, SMOKE_FRAMES, SMOKE_SOURCE, smokeFrame } from '../src/render/smokeFrames'
import { lightOf, turned } from '../src/render/vessel/solid'
import { castle, halfBeam, headingOf, HEADINGS, sheer, shipPicture } from '../src/render/vessel/ship'
import { DECOR_VARIANTS } from '../src/world/decor'
import { DOOR } from '../src/render/built/parts'

describe('what grows wild is painted by code', () => {
  it('covers every kind of the map with as many variants as the map asks for', () => {
    for (const [kind, variants] of Object.entries(DECOR_VARIANTS)) {
      // hedges, beds and gardens beside houses have their own painter (gardenSprites.ts)
      if (kind === 'hedge' || kind === 'bed' || kind === 'garden' || kind === 'yard') continue
      expect(GROWN[kind]?.variants, kind).toBe(variants)
    }
  })

  it('keeps the measure: a tree is several doors high, a tuft of grass far lower than one', () => {
    expect(GROWN.tree.h / DOOR).toBeGreaterThan(4)
    // an old broad-leaved tree stands as tall as a town house and is wider than a fir, which stays the slimmer of the two
    expect(GROWN.tree.h / DOOR).toBeGreaterThan(7)
    expect(GROWN.tree.w).toBeGreaterThan(GROWN.pine.w * 1.5)
    expect(GROWN.pine.h / GROWN.pine.w).toBeGreaterThan(GROWN.tree.h / GROWN.tree.w)
    expect(GROWN.tuft.h / DOOR).toBeLessThan(2)
    expect(GROWN.peak_large.h).toBeGreaterThan(GROWN.peak_medium.h)
    expect(GROWN.peak_medium.h).toBeGreaterThan(GROWN.peak_small.h)
  })

  it('is not painted where there is no canvas, and knows nothing of kinds it does not paint', () => {
    expect(grown('tree', 1)).toBeNull()
    expect(grown('hedge', 1)).toBeNull()
  })

  it('lights stone from the top left: a face that looks left is lighter than one that looks right', () => {
    expect(faceLight(-1, 0, 0.4)).toBeGreaterThan(faceLight(1, 0, 0.4))
    expect(faceLight(0, 0, 1)).toBeGreaterThan(faceLight(1, 0, 0))
    expect(faceLight(1, 0, 0)).toBeGreaterThanOrEqual(0.4)
  })

  it('builds a mountain that is highest at its summit and ends at its foot', () => {
    const summits = [{ x: 0, y: 0, r: 60, high: 100 }]
    expect(massifHeight(summits, 80, 0, 3)).toBe(0)
    expect(massifHeight(summits, 0, 0, 3)).toBeGreaterThan(massifHeight(summits, 40, 0, 3))
    expect(massifHeight(summits, 0, 0, 3)).toBeGreaterThan(40)
    expect(massifHeight(summits, 0, 0, 3)).toBeLessThan(140)
    expect(massifHeight(summits, 20, 10, 3)).toBe(massifHeight(summits, 20, 10, 3))
  })
})

describe('plants are heaped up in space and lit', () => {
  it('lets less light through the deeper a leaf lies under the others, and has the sun at the top left', () => {
    expect(lightUnder(0, 3)).toBe(1)
    expect(lightUnder(4, 3)).toBeLessThan(lightUnder(2, 3))
    expect(lightUnder(30, 3)).toBeLessThan(0.01)
    expect(SUN[0]).toBeLessThan(0)
    expect(SUN[1]).toBeLessThan(0)
    expect(Math.hypot(...SUN)).toBeCloseTo(1)
  })

  it('spreads the boughs of a crown around its middle and keeps them inside it', () => {
    const crown = { x: 32, y: 40, rx: 26, ry: 30 }
    const ends = boughEnds(crown, 9, numbers(5))
    expect(ends).toHaveLength(9)
    for (const [x, y] of ends) {
      expect(Math.abs(x - crown.x)).toBeLessThan(crown.rx)
      expect(Math.abs(y - crown.y)).toBeLessThan(crown.ry)
    }
    expect(ends.some(([x]) => x < crown.x)).toBe(true)
    expect(ends.some(([x]) => x > crown.x)).toBe(true)
    // leaves at the left of a crown are turned to the left, never by more than their own round
    expect(outOf(crown, [10, 40, 0])[0]).toBeLessThan(0)
    expect(Math.hypot(...outOf(crown, [10, 12, 9]))).toBeLessThanOrEqual(0.96)
    expect(outOf(crown, [32, 40, 0])).toEqual([0, 0, 0])
  })

  it('gives a fir its widest boughs at the foot and a point at the top', () => {
    expect(firReach(0)).toBe(1)
    expect(firReach(0.5)).toBeLessThan(firReach(0.2))
    expect(firReach(1)).toBeLessThan(0.1)
    expect(firReach(1)).toBeGreaterThan(0)
  })
})

describe('the ship is built by code', () => {
  it('has a hull that is full aft, widest amidships and comes to a point at the bow', () => {
    expect(halfBeam(1)).toBe(0)
    expect(halfBeam(0)).toBeGreaterThan(0.15)
    expect(halfBeam(0.5)).toBeGreaterThan(halfBeam(0))
    expect(halfBeam(0.5)).toBeGreaterThan(halfBeam(0.9))
  })

  it('rises to both ends and is built up fore and aft, highest at the poop', () => {
    expect(sheer(0)).toBeGreaterThan(sheer(0.5))
    expect(sheer(1)).toBeGreaterThan(sheer(0.5))
    expect(castle(0.05)).toBeGreaterThan(castle(0.25))
    expect(castle(0.25)).toBeGreaterThan(castle(0.5))
    expect(castle(0.9)).toBeGreaterThan(0)
    // a sailor can stand behind the rail: the side of the ship is about as high as a door amidships
    expect(sheer(0.5) / DOOR).toBeGreaterThan(0.8)
    expect(sheer(0.5) / DOOR).toBeLessThan(1.5)
  })

  it('has a picture for each of eight headings; at its mooring it lies along the tiles', () => {
    expect(HEADINGS).toBe(8)
    // moored, a ship points down and to the left on screen: that is along v
    const moored = sectorFor(-1, 0.5)
    expect(moored).toBe(3)
    expect(headingOf(moored)).toBeCloseTo(Math.PI / 2)
    expect(headingOf(1)).toBeCloseTo(0)
    // to the right on screen is between the tile axes
    expect(headingOf(sectorFor(1, 0))).toBeCloseTo(-Math.PI / 4)
    expect(sectorFor(0, 1)).toBe(2)
    expect(sectorFor(0, -1)).toBe(6)
    const all = new Set<number>()
    for (let k = 0; k < 16; k++) all.add(sectorFor(Math.cos(k * 0.4), Math.sin(k * 0.4)))
    expect(all.size).toBe(8)
  })

  it('turns with its heading and keeps the sun on the same side of the world', () => {
    const [u, v, z] = turned([1, 0, 5], Math.PI / 2)
    expect(u).toBeCloseTo(0)
    expect(v).toBeCloseTo(1)
    expect(z).toBe(5)
    // the left walls of buildings look along +v and are lit, the right ones along +u and are not
    expect(lightOf(0, 1, 0)).toBeGreaterThan(lightOf(1, 0, 0))
    expect(lightOf(0, 0, 1)).toBeGreaterThan(lightOf(1, 0, 0))
    expect(shipPicture(3)).toBeNull()
  })
})

describe('smoke', () => {
  it('loops without a seam: a puff of the last picture goes on in the first', () => {
    for (let puff = 0; puff < 6; puff++) {
      expect(puffAt(SMOKE_FRAMES, puff)).toEqual(puffAt(0, puff))
      const last = puffAt(SMOKE_FRAMES - 1, puff)
      const first = puffAt(0, puff)
      // either it rose a little, or it has gone and a new one leaves the chimney
      if (first.y < last.y) expect(last.y - first.y).toBeLessThan(12)
      else expect(first.alpha).toBeLessThan(0.05)
    }
  })

  it('leaves the chimney small and thin, grows as it rises, and is gone at the top', () => {
    let low = { r: 0, y: 0, alpha: 1 }
    let high = { r: 0, y: 1000, alpha: 1 }
    for (let frame = 0; frame < SMOKE_FRAMES; frame++) {
      const puff = puffAt(frame, 0)
      expect(puff.y).toBeLessThanOrEqual(SMOKE_SOURCE.y)
      expect(puff.y).toBeGreaterThan(0)
      if (puff.y > low.y) low = puff
      if (puff.y < high.y) high = puff
    }
    expect(high.r).toBeGreaterThan(low.r * 2)
    expect(high.alpha).toBeLessThan(0.1)
    expect(low.alpha).toBeLessThan(0.1)
    expect(smokeFrame(0)).toBeNull()
  })
})
