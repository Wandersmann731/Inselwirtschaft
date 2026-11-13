import { describe, expect, it } from 'vitest'
import { landShare, paintGround } from '../src/render/groundTextures'
import { wearAt, wearField } from '../src/render/terrainChunk'
import type { GroundTextures, Texture } from '../src/world/ground'
import { Terrain, type GameMap } from '../src/world/terrain'

const plain = (r: number, g: number, b: number): Texture => ({ data: new Uint8ClampedArray([r, g, b, 255]), size: 1 })
const textures: GroundTextures = { grass: plain(90, 160, 70), forest: plain(30, 80, 40), sand: plain(220, 200, 150), rock: plain(130, 130, 130) }

/** A map of `width` by `height` tiles filled by `at`. */
function mapOf(width: number, height: number, at: (x: number, y: number) => number): GameMap {
  const tiles: number[] = []
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) tiles.push(at(x, y))
  return { width, height, tiles }
}

/** The ground pixel at a tile position as [r, g, b, a]. */
function pixel(map: GameMap, seed: number, u: number, v: number, wear?: (u: number, v: number) => number): number[] {
  const out = new Uint8ClampedArray(4)
  paintGround(map, textures, seed, (u - v) * 32, (u + v) * 16, out, 0, undefined, wear)
  return [...out]
}

describe('the ground between two terrains', () => {
  // forest on the left half, grass on the right, far from any coast
  const map = mapOf(40, 40, (x) => (x < 20 ? Terrain.Forest : Terrain.Grass))

  it('changes colour gradually: no step from one picture pixel to the next', () => {
    for (let seed = 1; seed <= 5; seed++) {
      for (const row of [12.3, 20.5, 27.8]) {
        let previous = pixel(map, seed, 15, row)
        for (let u = 15; u <= 25; u += 1 / 64) {
          const here = pixel(map, seed, u, row)
          // a hard tile edge between these two textures would be a step of 80 in green
          expect(Math.abs(here[1] - previous[1])).toBeLessThan(14)
          previous = here
        }
      }
    }
  })

  it('is forest floor well inside the forest and grass well outside', () => {
    expect(pixel(map, 3, 10.5, 20.5)[1]).toBeLessThan(pixel(map, 3, 30.5, 20.5)[1])
  })

  it('does not follow the tile edge: the border lies elsewhere in every row', () => {
    // where along the row the colour is halfway between the two terrains
    const crossing = (row: number): number => {
      const from = pixel(map, 2, 15, row)[1]
      const to = pixel(map, 2, 25, row)[1]
      for (let u = 15; u <= 25; u += 1 / 32) if (pixel(map, 2, u, row)[1] > (from + to) / 2) return u
      return 25
    }
    const places = [10.5, 14.5, 18.5, 22.5, 26.5, 30.5].map(crossing)
    expect(Math.max(...places) - Math.min(...places)).toBeGreaterThan(0.25)
  })
})

describe('trodden ground', () => {
  const map = mapOf(30, 30, () => Terrain.Grass)
  const none = new Array<number>(900).fill(0)

  it('is bare earth: much less green than untouched grass', () => {
    let fresh = 0
    let worn = 0
    for (let u = 10; u < 20; u += 0.37) {
      for (let v = 10; v < 20; v += 0.41) {
        const a = pixel(map, 4, u, v)
        const b = pixel(map, 4, u, v, () => 1)
        fresh += a[1] - a[0]
        worn += b[1] - b[0]
      }
    }
    expect(worn).toBeLessThan(fresh * 0.4)
  })

  it('lies on roads and beside them, less with distance, and nowhere else', () => {
    const roads = [...none]
    for (let x = 5; x < 25; x++) roads[15 * 30 + x] = 1
    const field = wearField({ map, occupancy: none, roads, yard: null })
    const on = wearAt(field, 30, 30, 12.5, 15.5)
    const beside = wearAt(field, 30, 30, 12.5, 16.5)
    expect(on).toBe(1)
    expect(beside).toBeGreaterThan(0)
    expect(beside).toBeLessThan(0.5)
    expect(wearAt(field, 30, 30, 12.5, 18.5)).toBe(0)
  })

  it('is uneven beside a road, so the earth does not follow the tile grid', () => {
    const roads = [...none]
    for (let x = 5; x < 25; x++) roads[15 * 30 + x] = 1
    const field = wearField({ map, occupancy: [...none], roads, yard: null })
    const along = Array.from({ length: 12 }, (_, i) => wearAt(field, 30, 30, 8.5 + i, 16.5))
    expect(Math.max(...along) - Math.min(...along)).toBeGreaterThan(0.1)
  })
})

describe('the edge of the land', () => {
  // land on the left, sea on the right
  const map = mapOf(30, 30, (x) => (x < 15 ? Terrain.Grass : Terrain.Water))

  it('is sand at every shore, also where grass tiles meet the sea', () => {
    // walk out to sea and take the last fully opaque pixel: it is sandy (red above green), not grass
    for (const row of [8.5, 14.5, 21.5]) {
      let last = pixel(map, 6, 10, row)
      for (let u = 10; u < 20; u += 1 / 64) {
        const here = pixel(map, 6, u, row)
        if (here[3] < 255) break
        last = here
      }
      expect(last[0]).toBeGreaterThan(last[1])
    }
  })

  it('ends in a soft pixel, not a hard step, and open sea stays clear', () => {
    let soft = 0
    for (let u = 10; u < 20; u += 1 / 256) {
      const alpha = pixel(map, 6, u, 14.5)[3]
      if (alpha > 5 && alpha < 250) soft++
    }
    expect(soft).toBeGreaterThan(0)
    expect(pixel(map, 6, 25.5, 14.5)[3]).toBe(0)
  })
})

describe('the ground at the water', () => {
  // beach on the left, sea on the right
  const map = mapOf(30, 30, (x) => (x < 15 ? Terrain.Beach : Terrain.Water))

  it('turns damp and darker towards the sea, never paler', () => {
    for (const row of [9.5, 14.5, 20.5]) {
      const dry = pixel(map, 6, 8, row)
      let last = dry
      for (let u = 10; u < 20; u += 1 / 64) {
        const here = pixel(map, 6, u, row)
        if (here[3] < 255) break
        last = here
      }
      expect(last[0]).toBeLessThan(dry[0])
      expect(last[1]).toBeLessThan(dry[1])
    }
  })

  it('leaves the sea clear: shallows and wet sand are drawn below the ground picture', () => {
    for (let u = 16.5; u < 22; u += 0.5) expect(pixel(map, 6, u, 14.5)[3]).toBe(0)
  })
})

describe('a building at the water', () => {
  // a strip of beach between sea rows: the wobbled coast cuts into it for most seeds
  const W = Terrain.Water
  const B = Terrain.Beach
  const map: GameMap = { width: 9, height: 7, tiles: [...Array(27).fill(W), ...Array(9).fill(B), ...Array(27).fill(W)] }
  const solid = (x: number, y: number): boolean => y === 3 && x === 4

  it('keeps all of its tile land, whatever the coast noise does', () => {
    for (let seed = 1; seed <= 20; seed++) {
      for (let a = 0.05; a < 1; a += 0.1) for (let b = 0.05; b < 1; b += 0.1) expect(landShare(map, seed, 4 + a, 3 + b, solid)).toBeGreaterThanOrEqual(0.5)
    }
  })

  it('has sand reaching out a little beyond its tile edge, and open sea further out', () => {
    // the sea rows begin at v = 4: a little beyond the edge is still land, a tile and a half out is sea
    for (let seed = 1; seed <= 20; seed++) {
      expect(landShare(map, seed, 4.5, 4.08, solid)).toBeGreaterThanOrEqual(0.5)
      expect(landShare(map, seed, 4.5, 5.6, solid)).toBeLessThan(0.5)
    }
  })

  it('changes nothing far from buildings', () => {
    for (let seed = 1; seed <= 5; seed++) expect(landShare(map, seed, 1.3, 3.4, solid)).toBe(landShare(map, seed, 1.3, 3.4))
  })
})
