import { describe, expect, it } from 'vitest'
import { fadePixels } from '../src/render/coastFade'
import { isLit } from '../src/render/lightLayer'
import { clearPaintedWater } from '../src/render/waterPlot'
import { findPanes, onBuilding, shedZone } from '../src/render/windowLights'
import type { PlacedBuilding } from '../src/sim/state'
import { createHouse } from '../src/sim/tiers'
import { createProduction } from '../src/sim/productionState'

type Colour = [number, number, number]
const WALL: Colour = [226, 208, 170]
const GLASS: Colour = [40, 44, 58]
const BEAM: Colour = [52, 32, 22]
const MOSS: Colour = [30, 62, 24]
const FIRE: Colour = [250, 190, 70]
const SOOT: Colour = [60, 50, 46]

/** A picture filled with one colour, with rectangles painted on it. */
function picture(width: number, height: number, base: Colour, rects: [number, number, number, number, Colour][]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4)
  const paint = (x: number, y: number, colour: Colour): void => data.set([...colour, 255], (y * width + x) * 4)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) paint(x, y, base)
  for (const [x0, y0, w, h, colour] of rects) for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) paint(x, y, colour)
  return data
}

describe('windows in a building picture', () => {
  it('finds a dark pane set into a light wall', () => {
    const { panes, mask } = findPanes(picture(40, 40, WALL, [[10, 10, 7, 10, GLASS]]), 40, 40)
    expect(panes).toHaveLength(1)
    expect(panes[0]).toMatchObject({ x: 10, y: 10, w: 7, h: 10, warm: false })
    expect(mask[12 * 40 + 12]).toBe(1)
    expect(mask[5 * 40 + 5]).toBe(0)
  })

  it('takes panes split by glazing bars as one window', () => {
    // two panes of 4 by 9 with a light bar of one pixel between them
    const { panes } = findPanes(picture(40, 40, WALL, [[10, 10, 4, 9, GLASS], [15, 10, 4, 9, GLASS]]), 40, 40)
    expect(panes).toHaveLength(1)
    expect(panes[0].w).toBe(9)
  })

  it('ignores beams and outlines, moss, flat shadow strips and whole dark roofs', () => {
    const thin = findPanes(picture(40, 40, WALL, [[5, 5, 2, 30, BEAM], [5, 20, 30, 2, BEAM]]), 40, 40)
    expect(thin.panes).toEqual([])
    expect(findPanes(picture(40, 40, WALL, [[10, 10, 7, 10, MOSS]]), 40, 40).panes).toEqual([])
    expect(findPanes(picture(40, 40, WALL, [[6, 10, 17, 5, GLASS]]), 40, 40).panes).toEqual([])
    expect(findPanes(picture(60, 60, WALL, [[5, 5, 50, 40, GLASS]]), 60, 60).panes).toEqual([])
  })

  it('ignores a dark patch among other dark things: that is a roof tile, not a window', () => {
    const tiles: [number, number, number, number, Colour][] = []
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) tiles.push([4 + col * 8, 4 + row * 8, 6, 6, GLASS])
    expect(findPanes(picture(40, 40, [90, 96, 120], tiles), 40, 40).panes).toEqual([])
  })

  it('finds painted fire and lamp light: a bright warm patch in something dark', () => {
    const { panes } = findPanes(picture(40, 40, SOOT, [[12, 12, 6, 7, FIRE]]), 40, 40)
    expect(panes).toHaveLength(1)
    expect(panes[0].warm).toBe(true)
    // the same yellow on a light field is a hay stack
    expect(findPanes(picture(40, 40, [236, 200, 90], [[12, 12, 6, 7, FIRE]]), 40, 40).panes).toEqual([])
  })

  it('lets the caller turn panes down by where they sit', () => {
    const data = picture(40, 40, WALL, [[10, 10, 7, 10, GLASS]])
    expect(findPanes(data, 40, 40, () => false).panes).toEqual([])
    const asked: number[][] = []
    findPanes(data, 40, 40, (x, y) => (asked.push([x, y]), true))
    expect(asked).toEqual([[13.5, 20]])
  })

  it('keeps windows to the building: not at the front of the plot, and on a farm only at the shed in the back', () => {
    // a 2x2 plot in a 256 wide picture: top corner at (128, 100), bottom corner at (128, 228)
    const frame = { originX: 128, originY: 100, scale: 2, w: 2, h: 2, mirrored: false }
    expect(onBuilding(128, 150, frame, 256, false)).toBe(true)
    expect(onBuilding(128, 222, frame, 256, false)).toBe(false)
    expect(onBuilding(236, 166, frame, 256, false)).toBe(false)
    expect(onBuilding(128, 180, frame, 256, false)).toBe(true)
    expect(onBuilding(128, 180, frame, 256, true)).toBe(false)
    expect(onBuilding(128, 140, frame, 256, true)).toBe(true)
  })
})

describe('windows on a farm', () => {
  it('count only at the shed, the highest thing in the picture', () => {
    // a field from row 60 down, a shed 30 wide rising from row 10 at x 100 to 129
    const data = new Uint8ClampedArray(200 * 150 * 4)
    for (let y = 60; y < 150; y++) for (let x = 0; x < 200; x++) data[(y * 200 + x) * 4 + 3] = 255
    for (let y = 10; y < 60; y++) for (let x = 100; x < 130; x++) data[(y * 200 + x) * 4 + 3] = 255
    const inShed = shedZone(data, 200, 150)
    expect(inShed(114, 50)).toBe(true)
    expect(inShed(40, 50)).toBe(false)
    expect(inShed(114, 140)).toBe(false)
    expect(shedZone(new Uint8ClampedArray(16), 2, 2)(0, 0)).toBe(false)
  })
})

describe('lit buildings', () => {
  const house = (residents: number, ruin = false): PlacedBuilding => ({ id: 1, type: 'house_pioneers', x: 0, y: 0, rotated: false, active: true, house: { ...createHouse('pioneers'), residents, ruin } })
  const bakery = (kind: 'producing' | 'waiting', active = true): PlacedBuilding => ({ id: 2, type: 'bakery', x: 0, y: 0, rotated: false, active, production: { ...createProduction(), status: { kind } } })

  it('are houses people live in, open public buildings and workshops at work', () => {
    expect(isLit(house(4))).toBe(true)
    expect(isLit(house(0))).toBe(false)
    expect(isLit(house(4, true))).toBe(false)
    expect(isLit(bakery('producing'))).toBe(true)
    expect(isLit(bakery('waiting'))).toBe(false)
    expect(isLit({ id: 3, type: 'chapel', x: 0, y: 0, rotated: false, active: true })).toBe(true)
    expect(isLit({ id: 3, type: 'chapel', x: 0, y: 0, rotated: false, active: false })).toBe(false)
  })
})

describe('back edges of a plot on the shore', () => {
  const GRASS: Colour = [96, 150, 60]
  const ROOF: Colour = [170, 60, 40]
  // 2x2 plot at scale 1: top corner (64, 20), right corner (128, 52), bottom (64, 84), left (0, 52)
  const frame = { originX: 64, originY: 20, scale: 1, w: 2, h: 2, mirrored: false }
  const edges = { ne: true, se: false, sw: false, nw: false }
  const alpha = (data: Uint8ClampedArray, x: number, y: number): number => data[(y * 128 + x) * 4 + 3]

  /** A grass diamond; with `roof`, a red block rises over the NE edge in the columns 90 to 110. */
  function plot(roof: boolean): Uint8ClampedArray {
    const data = new Uint8ClampedArray(128 * 100 * 4)
    for (let y = 0; y < 100; y++) {
      for (let x = 0; x < 128; x++) {
        const a = (x + 0.5 - 64) / 32
        const b = (y + 0.5 - 20) / 16
        const u = (a + b) / 2
        const v = (b - a) / 2
        if (u >= 0 && v >= 0 && u <= 2 && v <= 2) data.set([...GRASS, 255], (y * 128 + x) * 4)
        if (roof && x >= 90 && x <= 110 && y >= 10 && y <= 50) data.set([...ROOF, 255], (y * 128 + x) * 4)
      }
    }
    return data
  }

  it('let the open ground run out below the edge and keep it whole further in', () => {
    const data = plot(false)
    fadePixels(data, 128, 100, frame, edges, false)
    // column 80: the NE edge lies at y = 28
    expect(alpha(data, 80, 29)).toBeLessThan(40)
    expect(alpha(data, 80, 34)).toBeLessThan(255)
    expect(alpha(data, 80, 45)).toBe(255)
    // the NW side was not asked for
    expect(alpha(data, 40, 34)).toBe(255)
  })

  it('leave everything alone where a roof rises over the edge', () => {
    const data = plot(true)
    fadePixels(data, 128, 100, frame, edges, false)
    for (let y = 10; y <= 50; y++) expect(alpha(data, 100, y)).toBe(255)
    // beside the roof the ground still runs out
    expect(alpha(data, 80, 29)).toBeLessThan(40)
  })
})

describe('a pier painted on a block of water', () => {
  const SEA: Colour = [40, 90, 170]
  const SLATE: Colour = [70, 100, 150]
  const WOOD: Colour = [120, 80, 50]

  it('loses the water that hangs together with the bottom of the picture, and keeps a blue roof', () => {
    // sea in the lower half, a wooden hut on it with a slate roof that touches no water
    const data = picture(40, 40, WOOD, [[0, 20, 40, 20, SEA], [14, 14, 12, 10, WOOD], [14, 4, 12, 6, SLATE]])
    // the top rows are empty sky
    for (let i = 0; i < 40 * 2; i++) data[i * 4 + 3] = 0
    const removed = clearPaintedWater(data, 40, 40)
    expect(removed).toBeGreaterThan(600)
    const alpha = (x: number, y: number): number => data[(y * 40 + x) * 4 + 3]
    expect(alpha(5, 35)).toBe(0)
    expect(alpha(20, 6)).toBe(255)
    expect(alpha(20, 18)).toBe(255)
    // right beside the hut a soft rim of water stays
    expect(alpha(13, 22)).toBeGreaterThan(0)
    expect(alpha(13, 22)).toBeLessThan(255)
  })

  it('leaves a picture without water alone', () => {
    const data = picture(20, 20, WOOD, [])
    expect(clearPaintedWater(data, 20, 20)).toBe(0)
    expect(data[3]).toBe(255)
  })
})
