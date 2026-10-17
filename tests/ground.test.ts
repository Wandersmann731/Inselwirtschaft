import { describe, expect, it } from 'vitest'
import { groundPixel, type GroundTextures, type Texture } from '../src/world/ground'
import { Terrain, type GameMap } from '../src/world/terrain'

const plain = (r: number, g: number, b: number): Texture => ({ data: new Uint8ClampedArray([r, g, b, 255]), size: 1 })
const textures: GroundTextures = { grass: plain(90, 160, 70), forest: plain(40, 110, 50), sand: plain(220, 200, 150), rock: plain(130, 130, 130) }

/** Share of the pixels of tile (x, y) that come out as land (fully opaque). */
function landShare(map: GameMap, seed: number, x: number, y: number, solid?: (x: number, y: number) => boolean): number {
  const out = new Uint8ClampedArray(4)
  let land = 0
  let total = 0
  for (let a = 0.05; a < 1; a += 0.1) {
    for (let b = 0.05; b < 1; b += 0.1) {
      const u = x + a
      const v = y + b
      // tile coordinates to world pixels (64x32 diamonds)
      groundPixel(map, textures, seed, (u - v) * 32, (u + v) * 16, out, 0, solid)
      total++
      if (out[3] === 255) land++
    }
  }
  return land / total
}

describe('ground under buildings at the coast', () => {
  // a strip of beach between sea rows: the wobbled coast cuts into it for most seeds
  const W = Terrain.Water
  const B = Terrain.Beach
  const map: GameMap = { width: 5, height: 3, tiles: [W, W, W, W, W, B, B, B, B, B, W, W, W, W, W] }

  it('keeps a tile with a building on it entirely land, whatever the coast noise does', () => {
    const solid = (_x: number, y: number): boolean => y === 1
    for (let seed = 1; seed <= 20; seed++) for (let x = 0; x < 5; x++) expect(landShare(map, seed, x, 1, solid)).toBe(1)
  })

  it('lets the coast wobble through free tiles', () => {
    let cut = 0
    for (let seed = 1; seed <= 20; seed++) for (let x = 0; x < 5; x++) if (landShare(map, seed, x, 1) < 1) cut++
    expect(cut).toBeGreaterThan(0)
  })
})
