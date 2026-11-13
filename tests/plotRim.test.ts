import { describe, expect, it } from 'vitest'
import { fadePixels, isCultivated, RIM_TILES } from '../src/render/coastFade'

type Colour = [number, number, number]

describe('the rim of a plot on open land', () => {
  const GRASS: Colour = [96, 150, 60]
  const FENCE: Colour = [150, 100, 60]
  // 2x2 plot at scale 1: top corner (64, 20), right corner (128, 52), bottom (64, 84), left (0, 52)
  const frame = { originX: 64, originY: 20, scale: 1, w: 2, h: 2, mirrored: false }
  const inland = { ne: false, se: false, sw: false, nw: false }
  const alpha = (data: Uint8ClampedArray, x: number, y: number): number => data[(y * 128 + x) * 4 + 3]

  /** A grass diamond; with `fence`, a few pixels of another colour stand right at its front edge. */
  function plot(fence: boolean): Uint8ClampedArray {
    const data = new Uint8ClampedArray(128 * 100 * 4)
    for (let y = 0; y < 100; y++) {
      for (let x = 0; x < 128; x++) {
        const a = (x + 0.5 - 64) / 32
        const b = (y + 0.5 - 20) / 16
        const u = (a + b) / 2
        const v = (b - a) / 2
        if (u >= 0 && v >= 0 && u <= 2 && v <= 2) data.set([...GRASS, 255], (y * 128 + x) * 4)
      }
    }
    if (fence) for (let y = 79; y <= 82; y++) data.set([...FENCE, 255], (y * 128 + 64) * 4)
    return data
  }

  it('stays hard without a rim width, as before', () => {
    const data = plot(false)
    fadePixels(data, 128, 100, frame, inland, false)
    expect(alpha(data, 64, 82)).toBe(255)
    expect(alpha(data, 100, 65)).toBe(255)
  })

  it('lets the ground run out at the front edges and keeps the middle whole', () => {
    const data = plot(false)
    fadePixels(data, 128, 100, frame, inland, false, RIM_TILES.plot)
    // the pixels just inside the bottom corner and along the right front edge
    expect(alpha(data, 64, 83)).toBeLessThan(60)
    expect(alpha(data, 110, 60)).toBeLessThan(120)
    expect(alpha(data, 64, 52)).toBe(255)
  })

  it('is ragged: the ground ends at a different depth along one edge', () => {
    const data = plot(false)
    fadePixels(data, 128, 100, frame, inland, false, RIM_TILES.plot)
    // along the SE edge (u = 2), a fixed distance of 0.2 tiles inside it
    const kept = Array.from({ length: 14 }, (_, i) => {
      const u = 1.8
      const v = 0.3 + i * 0.1
      return alpha(data, Math.round(64 + (u - v) * 32), Math.round(20 + (u + v) * 16))
    })
    expect(Math.max(...kept) - Math.min(...kept)).toBeGreaterThan(60)
  })

  it('keeps what stands at the edge: a colour that is rare there is not ground', () => {
    const data = plot(true)
    fadePixels(data, 128, 100, frame, inland, false, RIM_TILES.plot)
    for (let y = 79; y <= 82; y++) expect(alpha(data, 64, y)).toBe(255)
    // the grass beside it still runs out
    expect(alpha(data, 66, 82)).toBeLessThan(60)
  })

  it('fades a flat yard at all four edges', () => {
    const data = plot(false)
    fadePixels(data, 128, 100, frame, inland, true, RIM_TILES.yard)
    expect(alpha(data, 64, 21)).toBeLessThan(60)
    expect(alpha(data, 64, 83)).toBeLessThan(60)
    expect(alpha(data, 64, 52)).toBe(255)
  })
})

describe('which plots are fields', () => {
  it('knows farms and pastures by their picture, and that a forester stands on an ordinary plot', () => {
    expect(isCultivated('buildings/grain_farm')).toBe(true)
    expect(isCultivated('buildings/grain_farm_2')).toBe(true)
    expect(isCultivated('buildings/sheep_farm_1')).toBe(true)
    expect(isCultivated('buildings/forester_1')).toBe(false)
    expect(isCultivated('buildings/house_settlers_2')).toBe(false)
    expect(isCultivated('quarters/yard_town_2x2_1')).toBe(false)
  })

  it('gives fields the narrowest rim, so they fill their tiles', () => {
    expect(RIM_TILES.field).toBeLessThan(RIM_TILES.yard)
    expect(RIM_TILES.yard).toBeLessThan(RIM_TILES.plot)
  })
})
