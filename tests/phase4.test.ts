import { describe, expect, it } from 'vitest'
import { gardenItems } from '../src/render/frontDecor'
import { pavedTiles, roadSignature } from '../src/render/roadLayer'
import { cobbleAt, trackAt } from '../src/render/roadTextures'
import { createHouse } from '../src/sim/tiers'
import type { PlacedBuilding } from '../src/sim/state'
import { decorForTile, isTall, type DecorContext } from '../src/world/decor'
import { Terrain, type GameMap } from '../src/world/terrain'

/** A map of `width` by `height` tiles filled by `at`. */
function mapOf(width: number, height: number, at: (x: number, y: number) => number): GameMap {
  const tiles: number[] = []
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) tiles.push(at(x, y))
  return { width, height, tiles }
}

const house = (id: number, x: number, y: number, tier: string): PlacedBuilding => ({ id, type: 'house_pioneers', x, y, rotated: false, active: true, house: createHouse(tier) }) as PlacedBuilding

/** An island state with the given houses on a map and roads on the given tiles. */
function town(map: GameMap, buildings: PlacedBuilding[], roadTiles: [number, number][] = []) {
  const occupancy = new Array<number>(map.width * map.height).fill(0)
  for (const b of buildings) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) occupancy[(b.y + dy) * map.width + b.x + dx] = b.id
  const roads = new Array<number>(map.width * map.height).fill(0)
  for (const [x, y] of roadTiles) roads[y * map.width + x] = 1
  return { map, buildings, occupancy, roads, id: 7 }
}

describe('the forest in layers', () => {
  // forest on the left half, grass on the right
  const map = mapOf(40, 40, (x) => (x < 20 ? Terrain.Forest : Terrain.Grass))
  const ctx: DecorContext = { map, seed: 3, climate: 'north', blocked: () => false }
  const column = (x: number) => Array.from({ length: 36 }, (_, i) => decorForTile(ctx, x, i + 2)).flat()
  const mean = (list: number[]): number => list.reduce((a, b) => a + b, 0) / Math.max(1, list.length)

  it('is closed at its rim: more young trees and bushes there than deep inside', () => {
    const low = (x: number): number => column(x).filter((item) => item.kind === 'bush' || ((item.kind === 'tree' || item.kind === 'pine') && item.scale < 0.69)).length
    expect(low(19)).toBeGreaterThan(low(8) * 1.5)
    expect(low(19)).toBeGreaterThan(36)
  })

  it('is lighter at the sunny rim and darker deep inside, and no two trees are the same green', () => {
    const shades = (x: number): number[] => column(x).filter((item) => item.kind === 'tree' || item.kind === 'pine').map((item) => item.shade ?? 1)
    expect(mean(shades(19))).toBeGreaterThan(mean(shades(8)) + 0.1)
    expect(new Set(shades(8).map((shade) => shade.toFixed(3))).size).toBeGreaterThan(20)
    for (const shade of [...shades(8), ...shades(19)]) expect(shade > 0.7 && shade < 1.25).toBe(true)
  })

  it('has trees of very different sizes', () => {
    const sizes = column(10).filter((item) => item.kind === 'tree' || item.kind === 'pine').map((item) => item.scale)
    expect(Math.min(...sizes)).toBeLessThan(0.6)
    expect(Math.max(...sizes)).toBeGreaterThan(1.3)
  })

  it('never grows hedges or beds by itself', () => {
    const kinds = new Set([...column(19), ...column(8), ...Array.from({ length: 36 }, (_, i) => decorForTile(ctx, 30, i + 2)).flat()].map((item) => item.kind))
    expect(kinds.has('hedge')).toBe(false)
    expect(kinds.has('bed')).toBe(false)
    expect(isTall('hedge') && isTall('bed')).toBe(true)
  })
})

describe('gardens beside houses', () => {
  const grass = mapOf(30, 30, () => Terrain.Grass)

  it('plants fenced gardens, hedges, beds and bushes on the free tiles around the houses of a town', () => {
    const houses = Array.from({ length: 12 }, (_, i) => house(i + 1, 3 + (i % 4) * 6, 3 + Math.floor(i / 4) * 6, 'settlers'))
    const items = gardenItems(town(grass, houses))
    const kinds = new Set(items.map((entry) => entry.item.kind))
    expect(kinds.has('garden') && kinds.has('hedge') && kinds.has('bed') && kinds.has('bush')).toBe(true)
    // gardens are the usual thing, and a tile with a garden carries nothing else
    const gardens = items.filter((entry) => entry.item.kind === 'garden')
    expect(gardens.length).toBeGreaterThan(items.length * 0.35)
    for (const garden of gardens) expect(items.filter((entry) => entry.tx === garden.tx && entry.ty === garden.ty)).toHaveLength(1)
    // every plant stands on a tile right beside a house
    const state = town(grass, houses)
    for (const entry of items) {
      expect(state.occupancy[entry.ty * 30 + entry.tx]).toBe(0)
      const beside = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => state.occupancy[(entry.ty + dy) * 30 + entry.tx + dx] !== 0)
      expect(beside).toBe(true)
    }
    expect(gardenItems(town(grass, houses))).toEqual(items)
  })

  it('keeps hedges for settlers and above, and lawns inside a hedge for citizens and above', () => {
    const houses = Array.from({ length: 12 }, (_, i) => house(i + 1, 3 + (i % 4) * 6, 3 + Math.floor(i / 4) * 6, 'pioneers'))
    const kinds = gardenItems(town(grass, houses)).map((entry) => entry.item.kind)
    expect(kinds.includes('hedge')).toBe(false)
    expect(kinds.includes('bed')).toBe(true)
    const lawns = (tier: string): number =>
      gardenItems(town(grass, Array.from({ length: 12 }, (_, i) => house(i + 1, 3 + (i % 4) * 6, 3 + Math.floor(i / 4) * 6, tier)))).filter((entry) => entry.item.kind === 'garden' && entry.item.variant === 4).length
    expect(lawns('settlers')).toBe(0)
    expect(lawns('citizens')).toBeGreaterThan(0)
  })

  it('plants nothing on roads, on sand right at the water or beside a ruin', () => {
    const one = [house(1, 10, 10, 'settlers')]
    const ring: [number, number][] = []
    for (let i = 9; i <= 12; i++) ring.push([i, 9], [i, 12], [9, i], [12, i])
    expect(gardenItems(town(grass, one, ring))).toEqual([])
    // a strip of sand as wide as the house, with the house on it: every free tile beside the house touches the sea
    expect(gardenItems(town(mapOf(30, 30, (_x, y) => (y === 10 || y === 11 ? Terrain.Beach : Terrain.Water)), [house(1, 10, 10, 'settlers')]))).toEqual([])
    // sand a step back from the sea is planted
    expect(gardenItems(town(mapOf(30, 30, () => Terrain.Beach), one)).length).toBeGreaterThan(0)
    const ruin = house(1, 10, 10, 'settlers')
    ruin.house!.ruin = true
    expect(gardenItems(town(grass, [ruin]))).toEqual([])
  })

  it('lays a hedge along the side of the house it stands at', () => {
    const items = gardenItems(town(grass, Array.from({ length: 12 }, (_, i) => house(i + 1, 3 + (i % 4) * 6, 3 + Math.floor(i / 4) * 6, 'settlers'))))
    for (const { item, tx, ty } of items.filter((entry) => entry.item.kind === 'hedge')) {
      // variants 1 and 2 run along x (down right), 3 and 4 along y: a hedge moved off its tile's middle in y runs along x
      const movedInY = Math.abs(item.y - (ty + 0.5)) > 0.2
      expect(item.variant <= 2).toBe(movedInY)
      expect(Math.abs(item.x - (tx + 0.5)) > 0.2).toBe(!movedInY)
    }
  })
})

describe('roads made by code', () => {
  const grass = mapOf(30, 30, () => Terrain.Grass)

  it('are paved near the houses of a town and stay tracks near pioneers and out in the country', () => {
    const paved = pavedTiles(town(grass, [house(1, 5, 5, 'settlers'), house(2, 20, 20, 'pioneers')]))
    expect(paved[5 * 30 + 8]).toBe(1) // two tiles beside the settlers
    expect(paved[5 * 30 + 9]).toBe(0)
    expect(paved[20 * 30 + 22]).toBe(0)
    const ruin = house(3, 5, 5, 'settlers')
    ruin.house!.ruin = true
    expect(pavedTiles(town(grass, [ruin]))[5 * 30 + 8]).toBe(0)
  })

  it('are drawn again when a road tile comes or its paving changes, and only then', () => {
    const paved = new Uint8Array(900)
    const before = roadSignature([40, 41, 42], paved)
    expect(roadSignature([40, 41, 42], paved)).toBe(before)
    expect(roadSignature([40, 41, 42, 43], paved)).not.toBe(before)
    paved[41] = 1
    expect(roadSignature([40, 41, 42], paved)).not.toBe(before)
  })

  it('have textures that repeat without a seam after two tiles', () => {
    const a = [0, 0, 0]
    const b = [0, 0, 0]
    for (const t of [0.13, 0.71, 1.4]) {
      cobbleAt(0.3, t, a)
      cobbleAt(2.3, t, b)
      expect(b[0]).toBeCloseTo(a[0], 4)
      trackAt(t, 0.6, a)
      trackAt(t, 2.6, b)
      expect(b[1]).toBeCloseTo(a[1], 4)
    }
  })

  it('show stones with dark joints on pavement, and warm earth on a track', () => {
    const colour = [0, 0, 0]
    let darkest = 255
    let lightest = 0
    let red = 0
    let blue = 0
    for (let i = 0; i < 4000; i++) {
      cobbleAt((i * 0.618) % 2, (i * 0.381) % 2, colour)
      const grey = (colour[0] + colour[1] + colour[2]) / 3
      darkest = Math.min(darkest, grey)
      lightest = Math.max(lightest, grey)
      trackAt((i * 0.618) % 2, (i * 0.381) % 2, colour)
      red += colour[0]
      blue += colour[2]
    }
    expect(lightest).toBeGreaterThan(darkest * 1.8)
    expect(red).toBeGreaterThan(blue * 1.3)
  })
})
