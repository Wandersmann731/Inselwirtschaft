import { describe, expect, it } from 'vitest'
import { pickVariant, buildingKey } from '../src/render/spriteKeys'
import { buildingRing } from '../src/world/surroundings'
import { placeBuilding, placeRoads } from '../src/sim/build'
import { decorForTile, isTall } from '../src/world/decor'
import { grassField } from './helpers'
import { Terrain } from '../src/world/terrain'

describe('buildingRing', () => {
  it('marks the free tiles around a building, also diagonally, but not the building itself', () => {
    const state = placeBuilding(grassField(20, 20, { coins: 1e6, stock: { tools: 99, wood: 99 } }), 'house_pioneers', 5, 5, false)
    const ring = buildingRing(state.map, state.occupancy)
    const at = (x: number, y: number) => ring[y * 20 + x]
    expect(at(4, 4)).toBe(1) // diagonal corner
    expect(at(7, 7)).toBe(1)
    expect(at(6, 4)).toBe(1)
    expect(at(5, 5)).toBe(0) // the building
    expect(at(3, 5)).toBe(0) // two tiles away
    expect(ring.reduce((sum, v) => sum + v, 0)).toBe(12)
  })

  it('is empty without buildings and stays inside the map at the edge', () => {
    const empty = grassField(10, 10)
    expect(buildingRing(empty.map, empty.occupancy).some((v) => v === 1)).toBe(false)
    const corner = placeBuilding(grassField(10, 10, { coins: 1e6, stock: { tools: 99, wood: 99 } }), 'house_pioneers', 0, 0, false)
    expect(buildingRing(corner.map, corner.occupancy).reduce((sum, v) => sum + v, 0)).toBe(5)
  })
})

describe('trees and roads', () => {
  const forest = grassField(20, 20).map.tiles.map(() => Terrain.Forest)
  const base = grassField(20, 20)
  const map = { ...base.map, tiles: forest }

  it('clears the forest on road tiles and under buildings but not next to them', () => {
    const ctx = (blocked: (x: number, y: number) => boolean) => ({ map, seed: 1, climate: 'north', blocked })
    const road = (x: number, y: number) => x === 5 && y === 5
    let trees = 0
    for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) trees += decorForTile(ctx(road), x, y).filter((i) => isTall(i.kind)).length
    expect(decorForTile(ctx(road), 5, 5)).toEqual([])
    expect(decorForTile(ctx(road), 6, 5).length).toBeGreaterThan(0)
    expect(trees).toBeGreaterThan(400)
  })

  it('keeps a laid road free of trees', () => {
    const state = placeRoads(grassField(20, 20, { coins: 1e6 }), [{ x: 5, y: 5 }, { x: 6, y: 5 }])
    expect(state.roads[5 * 20 + 5]).toBe(1)
  })
})

describe('variants', () => {
  it('picks a variant from the position, always the same one and spread over all of them', () => {
    expect(pickVariant(16, 12, 7)).toBe(pickVariant(16, 12, 7))
    const seen = new Set<number>()
    for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) seen.add(pickVariant(16, x, y))
    expect(seen.size).toBe(16)
    for (const n of seen) expect(n).toBeLessThan(16)
  })

  it('does not give neighbouring positions the same variant too often', () => {
    let same = 0
    for (let x = 0; x < 100; x++) if (pickVariant(16, x, 3) === pickVariant(16, x + 2, 3)) same++
    expect(same).toBeLessThan(20)
  })

  it('falls back to the plain name while no pictures are loaded', () => {
    expect(buildingKey({ type: 'chapel', x: 1, y: 1, house: undefined })).toBe('buildings/chapel')
    expect(buildingKey({ type: 'house_pioneers', x: 1, y: 1, house: undefined })).toBe('buildings/house_pioneers')
  })
})
