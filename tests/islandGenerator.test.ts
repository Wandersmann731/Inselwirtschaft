import { describe, expect, it } from 'vitest'
import { world } from '../src/data'
import { largestComponent } from '../src/world/grid'
import { generateIsland } from '../src/world/islandGenerator'
import { Terrain } from '../src/world/terrain'

const SEEDS = [1, 2, 3, 42, 1234, 99999]

function maskOf(tiles: number[], match: (t: number) => boolean): Uint8Array {
  return Uint8Array.from(tiles, (t) => (match(t) ? 1 : 0))
}

const count = (mask: Uint8Array): number => mask.reduce((sum, v) => sum + v, 0)

describe('generateIsland', () => {
  it('gives the same island for the same seed', () => {
    expect(generateIsland(7)).toEqual(generateIsland(7))
  })

  it('gives different islands for different seeds', () => {
    expect(generateIsland(7).tiles).not.toEqual(generateIsland(8).tiles)
  })

  it('keeps the map size within the configured limits and the tile count consistent', () => {
    for (const seed of SEEDS) {
      const map = generateIsland(seed)
      for (const size of [map.width, map.height]) {
        expect(size).toBeGreaterThanOrEqual(world.island.minSize)
        expect(size).toBeLessThanOrEqual(world.island.maxSize)
      }
      expect(map.tiles).toHaveLength(map.width * map.height)
    }
  })

  it('surrounds the island with water', () => {
    for (const seed of SEEDS) {
      const { width, height, tiles } = generateIsland(seed)
      for (let x = 0; x < width; x++) {
        expect(tiles[x]).toBe(Terrain.Water)
        expect(tiles[(height - 1) * width + x]).toBe(Terrain.Water)
      }
      for (let y = 0; y < height; y++) {
        expect(tiles[y * width]).toBe(Terrain.Water)
        expect(tiles[y * width + width - 1]).toBe(Terrain.Water)
      }
    }
  })

  it('contains beach, grass, forest and mountain', () => {
    for (const seed of SEEDS) {
      const used = new Set(generateIsland(seed).tiles)
      for (const terrain of [Terrain.Beach, Terrain.Grass, Terrain.Forest, Terrain.Mountain]) {
        expect(used.has(terrain), `seed ${seed} terrain ${terrain}`).toBe(true)
      }
    }
  })

  it('has exactly one connected landmass and one connected mountain group', () => {
    for (const seed of SEEDS) {
      const { width, height, tiles } = generateIsland(seed)
      const land = maskOf(tiles, (t) => t !== Terrain.Water)
      const mountain = maskOf(tiles, (t) => t === Terrain.Mountain)
      expect(count(largestComponent(land, width, height))).toBe(count(land))
      expect(count(largestComponent(mountain, width, height))).toBe(count(mountain))
    }
  })

  it('puts a beach between water and grass or forest', () => {
    for (const seed of SEEDS) {
      const { width, height, tiles } = generateIsland(seed)
      let violations = 0
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const t = tiles[y * width + x]
          if (t !== Terrain.Grass && t !== Terrain.Forest) continue
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (tiles[(y + dy) * width + x + dx] === Terrain.Water) violations++
            }
          }
        }
      }
      expect(violations, `seed ${seed}`).toBe(0)
    }
  })
})

describe('largestComponent', () => {
  it('keeps only the biggest group', () => {
    // 5x1 row: group of 1, gap, group of 3
    const mask = Uint8Array.from([1, 0, 1, 1, 1])
    expect(Array.from(largestComponent(mask, 5, 1))).toEqual([0, 0, 1, 1, 1])
  })

  it('does not connect diagonal cells', () => {
    const mask = Uint8Array.from([1, 0, 0, 1])
    expect(count(largestComponent(mask, 2, 2))).toBe(1)
  })
})
