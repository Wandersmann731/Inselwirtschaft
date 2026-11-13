import { describe, expect, it } from 'vitest'
import { LIGHT, shadePlot, shadowMap } from '../src/render/buildingShadows'

type Colour = [number, number, number]
const GRASS: Colour = [96, 150, 60]
const WALL: Colour = [200, 180, 150]
const W = 160
const H = 130
// 2x2 plot at scale 1: top corner (80, 50), right corner (144, 82), bottom (80, 114), left (16, 82)
const frame = { originX: 80, originY: 50, scale: 1, w: 2, h: 2, mirrored: false }

/** A grass plot; with `house`, a block of wall stands in its middle and rises 40 pixels over the top corner. */
function picture(house: boolean): Uint8ClampedArray {
  const data = new Uint8ClampedArray(W * H * 4)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const a = (x + 0.5 - 80) / 32
      const b = (y + 0.5 - 50) / 16
      const u = (a + b) / 2
      const v = (b - a) / 2
      if (u >= 0 && v >= 0 && u <= 2 && v <= 2) data.set([...GRASS, 255], (y * W + x) * 4)
      if (house && x >= 66 && x < 94 && y >= 10 && y < 90) data.set([...WALL, 255], (y * W + x) * 4)
    }
  }
  return data
}

describe('the shadow of a building picture', () => {
  it('falls to the right and down, away from the sun in the top left, and not to the left', () => {
    const map = shadowMap(picture(true), W, H, frame)
    const at = (x: number, y: number): number => map.dark[(y + map.top) * map.width + x + map.left]
    // right of the foot of the wall (the wall ends at x = 94, its foot lies between y = 90 and 97)
    expect(at(110, 100)).toBeGreaterThan(0.3)
    expect(at(125, 104)).toBeGreaterThan(0.2)
    // left of the building and above it there is none
    expect(at(40, 85)).toBeLessThan(0.02)
    expect(at(80, 2)).toBeLessThan(0.02)
    expect(LIGHT.x).toBeGreaterThan(LIGHT.y)
  })

  it('is as long as the building is high', () => {
    const map = shadowMap(picture(true), W, H, frame)
    // the wall rises about 80 pixels: its shadow must be wider than the picture was
    expect(map.width).toBeGreaterThan(W + 80 * LIGHT.x - 4)
    let far = 0
    for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) if (map.dark[y * map.width + x] > 0.1) far = Math.max(far, x - map.left)
    expect(far).toBeGreaterThan(94 + 80 * LIGHT.x * 0.8)
  })

  it('is darkest right at the foot of the wall: the contact shadow', () => {
    const map = shadowMap(picture(true), W, H, frame)
    const at = (x: number, y: number): number => map.dark[(y + map.top) * map.width + x + map.left]
    expect(at(80, 98)).toBeGreaterThan(at(140, 108))
    expect(at(80, 98)).toBeGreaterThan(0.45)
  })

  it('is soft: no jump from one cell to the next', () => {
    const map = shadowMap(picture(true), W, H, frame)
    let jump = 0
    for (let y = 0; y < map.height; y++) for (let x = 1; x < map.width; x++) jump = Math.max(jump, Math.abs(map.dark[y * map.width + x] - map.dark[y * map.width + x - 1]))
    expect(jump).toBeLessThan(0.3)
  })

  it('knows the wall as building and the plot as ground; a bare plot throws nothing', () => {
    const map = shadowMap(picture(true), W, H, frame)
    expect(map.body[40 * map.cellsWide + 80]).toBe(1)
    expect(map.body[100 * map.cellsWide + 120]).toBe(0)
    const bare = shadowMap(picture(false), W, H, frame)
    expect(Math.max(...bare.dark)).toBe(0)
  })
})

describe('the shadow on the building\'s own plot', () => {
  const pixel = (data: Uint8ClampedArray, x: number, y: number): number[] => [...data.slice((y * W + x) * 4, (y * W + x) * 4 + 4)]

  it('darkens the ground right of the wall towards blue and leaves wall and sunny ground alone', () => {
    const data = picture(true)
    shadePlot(data, W, H, frame)
    const shaded = pixel(data, 104, 98)
    expect(shaded[1]).toBeLessThan(GRASS[1] - 20)
    // bluer than before: blue lost least
    expect(shaded[2] / GRASS[2]).toBeGreaterThan(shaded[1] / GRASS[1])
    expect(pixel(data, 80, 40)).toEqual([...WALL, 255])
    expect(pixel(data, 40, 82)).toEqual([...GRASS, 255])
    expect(shaded[3]).toBe(255)
  })

  it('falls to the right on a mirrored picture too', () => {
    const data = picture(true)
    shadePlot(data, W, H, { ...frame, mirrored: true })
    // read mirrored: the right of the screen is the left of the stored picture
    expect(pixel(data, W - 1 - 104, 98)[1]).toBeLessThan(GRASS[1] - 20)
    expect(pixel(data, W - 1 - 40, 82)).toEqual([...GRASS, 255])
  })
})
