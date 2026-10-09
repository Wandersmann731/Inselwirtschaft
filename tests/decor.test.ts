import { describe, expect, it } from 'vitest'
import { DECOR_VARIANTS, decorForTile, type DecorContext } from '../src/world/decor'
import { mountainDepth } from '../src/world/elevation'
import { fbm, hash2, valueNoise } from '../src/world/noise2d'
import { Terrain } from '../src/world/terrain'
import { generateIsland } from '../src/world/islandGenerator'

const map = generateIsland(1)
const ctx = (overrides: Partial<DecorContext> = {}): DecorContext => ({ map, seed: 1, climate: 'north', blocked: () => false, ...overrides })

function tilesOf(terrain: number): [number, number][] {
  const found: [number, number][] = []
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) if (map.tiles[y * map.width + x] === terrain) found.push([x, y])
  return found
}

describe('noise', () => {
  it('is deterministic and stays in [0, 1]', () => {
    expect(hash2(3, 4, 5)).toBe(hash2(3, 4, 5))
    expect(hash2(3, 4, 5)).not.toBe(hash2(4, 3, 5))
    for (let i = 0; i < 500; i++) {
      for (const value of [hash2(i, i * 3, 9), valueNoise(i * 0.37, i * 0.11, 2), fbm(i * 0.21, i * 0.05, 7, 3)]) {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(1)
      }
    }
  })

  it('changes smoothly between neighbouring points', () => {
    for (let i = 0; i < 200; i++) {
      expect(Math.abs(valueNoise(i * 0.5, 3, 1) - valueNoise(i * 0.5 + 0.01, 3, 1))).toBeLessThan(0.05)
    }
  })
})

describe('mountainDepth', () => {
  const depth = mountainDepth(map)
  it('is 0 outside the mountain and 1 at its edge, growing towards the middle', () => {
    let deepest = 0
    for (let i = 0; i < map.tiles.length; i++) {
      if (map.tiles[i] !== Terrain.Mountain) expect(depth[i]).toBe(0)
      else {
        expect(depth[i]).toBeGreaterThanOrEqual(1)
        deepest = Math.max(deepest, depth[i])
      }
    }
    expect(deepest).toBeGreaterThan(3)
  })
})

describe('decorForTile', () => {
  it('gives the same objects for the same tile every time', () => {
    const [x, y] = tilesOf(Terrain.Forest)[40]
    expect(decorForTile(ctx(), x, y)).toEqual(decorForTile(ctx(), x, y))
  })

  it('puts nothing on water, outside the map or on blocked tiles', () => {
    const [wx, wy] = tilesOf(Terrain.Water)[0]
    expect(decorForTile(ctx(), wx, wy)).toEqual([])
    expect(decorForTile(ctx(), -1, 3)).toEqual([])
    const [fx, fy] = tilesOf(Terrain.Forest)[40]
    expect(decorForTile(ctx({ blocked: () => true }), fx, fy)).toEqual([])
  })

  it('keeps every object inside its tile and uses only existing pictures', () => {
    for (const terrain of [Terrain.Forest, Terrain.Grass, Terrain.Beach, Terrain.Mountain]) {
      for (const [x, y] of tilesOf(terrain).slice(0, 400)) {
        for (const item of decorForTile(ctx(), x, y)) {
          expect(item.x).toBeGreaterThanOrEqual(x)
          expect(item.x).toBeLessThanOrEqual(x + 1)
          expect(item.y).toBeGreaterThanOrEqual(y)
          expect(item.y).toBeLessThanOrEqual(y + 1)
          expect(item.variant).toBeGreaterThanOrEqual(1)
          expect(item.variant).toBeLessThanOrEqual(DECOR_VARIANTS[item.kind])
        }
      }
    }
  })

  it('grows trees on forest and peaks on mountains, bigger peaks further inside', () => {
    const kinds = (terrain: number) => new Set(tilesOf(terrain).flatMap(([x, y]) => decorForTile(ctx(), x, y).map((i) => i.kind)))
    expect(kinds(Terrain.Forest).has('tree')).toBe(true)
    expect(kinds(Terrain.Forest).has('pine')).toBe(true)
    const mountain = kinds(Terrain.Mountain)
    expect(mountain.has('peak_large') || mountain.has('peak_snow')).toBe(true)
    expect(mountain.has('peak_small')).toBe(true)
    const depth = mountainDepth(map)
    const avgScale = (min: number, max: number) => {
      const scales = tilesOf(Terrain.Mountain)
        .filter(([x, y]) => depth[y * map.width + x] >= min && depth[y * map.width + x] <= max)
        .flatMap(([x, y]) => decorForTile(ctx(), x, y).filter((i) => i.kind.startsWith('peak')))
        .map((i) => (i.kind === 'peak_small' ? 1 : i.kind === 'peak_medium' ? 2 : 3))
      return scales.reduce((a, b) => a + b, 0) / Math.max(1, scales.length)
    }
    expect(avgScale(6, 99)).toBeGreaterThan(avgScale(1, 2))
  })

  it('does not repeat: the arrangement of neighbouring forest tiles varies', () => {
    const forest = tilesOf(Terrain.Forest).slice(0, 300)
    const signatures = new Set(forest.map(([x, y]) => decorForTile(ctx(), x, y).map((i) => `${i.kind}${i.variant}${Math.round(i.x * 10)}`).join('|')))
    expect(signatures.size).toBeGreaterThan(200)
  })

  it('leans towards conifers in the cold and palms on warm beaches', () => {
    const share = (climate: string) => {
      const items = tilesOf(Terrain.Forest).flatMap(([x, y]) => decorForTile(ctx({ climate }), x, y)).filter((i) => i.kind === 'pine' || i.kind === 'tree')
      return items.filter((i) => i.kind === 'pine').length / items.length
    }
    expect(share('polar')).toBeGreaterThan(share('jungle'))
    const palms = (climate: string) => tilesOf(Terrain.Beach).flatMap(([x, y]) => decorForTile(ctx({ climate }), x, y)).filter((i) => i.kind === 'palm').length
    expect(palms('jungle')).toBeGreaterThan(0)
    expect(palms('north')).toBe(0)
  })
})
