import { describe, expect, it } from 'vitest'
import { stretches } from '../src/render/built/courts'
import { HOUSE_VARIANTS } from '../src/render/built/look'
import { plotOf } from '../src/render/built/plots'
import { FLAG_TILES, flagAt, type Flag } from '../src/render/flagstones'
import { gardenItems } from '../src/render/frontDecor'
import { pickVariant } from '../src/render/spriteKeys'
import { layoutSignature, wearField } from '../src/render/terrainChunk'
import { pavedAt, slabLaid, townGround } from '../src/render/townGround'
import { createHouse } from '../src/sim/tiers'
import type { PlacedBuilding } from '../src/sim/state'
import { Terrain, type GameMap } from '../src/world/terrain'

const SIZE = 40
const grass: GameMap = { width: SIZE, height: SIZE, tiles: new Array(SIZE * SIZE).fill(Terrain.Grass) }
const house = (id: number, x: number, y: number, tier: string): PlacedBuilding => ({ id, type: 'house_pioneers', x, y, rotated: false, active: true, house: createHouse(tier) }) as PlacedBuilding

function town(buildings: PlacedBuilding[], map: GameMap = grass) {
  const occupancy = new Array<number>(map.width * map.height).fill(0)
  for (const b of buildings) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) occupancy[(b.y + dy) * map.width + b.x + dx] = b.id
  return { map, buildings, occupancy, roads: new Array<number>(map.width * map.height).fill(0), id: 7 }
}

/** A place (even tiles, well inside the map) where a house of the tier gets a plan with this ground. */
function placeWith(tier: string, ground: 'flags' | 'garden', skip = 0): [number, number] {
  for (let y = 6; y < SIZE - 8; y += 2) {
    for (let x = 6; x < SIZE - 8; x += 2) {
      if (plotOf(tier, pickVariant(HOUSE_VARIANTS, x, y)).ground === ground && skip-- <= 0) return [x, y]
    }
  }
  throw new Error('no such place')
}

describe('the plot of a house', () => {
  it('is trodden earth for a cottage, and stone flags or a garden from the citizens on', () => {
    for (let variant = 0; variant < HOUSE_VARIANTS; variant++) {
      expect(plotOf('pioneers', variant)).toEqual({ ground: 'earth', enclosure: null })
      expect(plotOf('settlers', variant)).toEqual({ ground: 'earth', enclosure: null })
    }
    for (const tier of ['citizens', 'merchants', 'aristocrats']) {
      const plots = Array.from({ length: HOUSE_VARIANTS }, (_, variant) => plotOf(tier, variant))
      expect(plots.some((plot) => plot.ground === 'flags')).toBe(true)
      expect(plots.some((plot) => plot.ground === 'garden')).toBe(true)
      expect(plots.every((plot) => plot.ground !== 'earth')).toBe(true)
      // a garden is closed towards the street by a hedge or a wall, flags lie open
      for (const plot of plots) expect(plot.enclosure !== null).toBe(plot.ground === 'garden')
    }
    // a town is mostly stone, the villas keep gardens
    const gardens = (tier: string): number => Array.from({ length: HOUSE_VARIANTS }, (_, variant) => plotOf(tier, variant)).filter((plot) => plot.ground === 'garden').length
    expect(gardens('merchants')).toBeLessThan(HOUSE_VARIANTS / 2)
    expect(gardens('aristocrats')).toBeGreaterThan(HOUSE_VARIANTS / 2)
    const kinds = new Set(['citizens', 'merchants', 'aristocrats'].flatMap((tier) => Array.from({ length: HOUSE_VARIANTS }, (_, variant) => plotOf(tier, variant).enclosure)))
    expect(kinds.has('hedge') && kinds.has('wall')).toBe(true)
  })
})

describe('the ground of a town', () => {
  it('is none where only cottages stand', () => {
    expect(townGround(town([house(1, 10, 10, 'pioneers'), house(2, 14, 10, 'settlers')]))).toBeNull()
  })

  it('paves the plot of a house that stands on flags, and a part of the way around it', () => {
    const [x, y] = placeWith('citizens', 'flags')
    const ground = townGround(town([house(1, x, y, 'citizens')]))!
    const at = (tx: number, ty: number): number => ground.paved[ty * SIZE + tx]
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      expect(at(x + dx, y + dy)).toBe(1)
      expect(ground.lawn[(y + dy) * SIZE + x + dx]).toBe(0)
    }
    // the tiles around it: paved in part, each to its own share, so the flags end somewhere on them
    const ring = [at(x - 1, y), at(x + 2, y + 1), at(x, y - 1), at(x + 1, y + 2), at(x - 1, y - 1)]
    for (const share of ring) {
      expect(share).toBeGreaterThan(0.2)
      expect(share).toBeLessThan(0.7)
    }
    expect(new Set(ring).size).toBeGreaterThan(1)
    expect(at(x + 4, y)).toBe(0)
    expect(at(x, y + 4)).toBe(0)
  })

  it('keeps the plot of a house with a garden as lawn, without flags', () => {
    const [x, y] = placeWith('aristocrats', 'garden')
    const ground = townGround(town([house(1, x, y, 'aristocrats')]))!
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      expect(ground.lawn[(y + dy) * SIZE + x + dx]).toBe(1)
      expect(ground.paved[(y + dy) * SIZE + x + dx]).toBe(0)
    }
    // nothing is paved around a lone garden
    expect(ground.paved[y * SIZE + x - 1]).toBe(0)
    // and nobody treads the grass of it bare
    const state = town([house(1, x, y, 'aristocrats')])
    const wear = wearField({ map: grass, occupancy: state.occupancy, roads: state.roads, yard: null, town: ground })
    expect(wear[y * SIZE + x]).toBe(0)
    expect(wearField({ map: grass, occupancy: [...state.occupancy], roads: state.roads, yard: null, town: null })[y * SIZE + x]).toBeGreaterThan(0)
  })

  it('paves the lane between two houses of the town from wall to wall, whatever they stand on', () => {
    const [x, y] = placeWith('merchants', 'garden')
    // a second house one tile further on: the tile between them touches both
    const ground = townGround(town([house(1, x, y, 'merchants'), house(2, x + 3, y, 'citizens')]))!
    expect(ground.paved[y * SIZE + x + 2]).toBe(1)
    expect(ground.paved[(y + 1) * SIZE + x + 2]).toBe(1)
    // a cottage beside a town house makes no lane
    const mixed = townGround(town([house(1, x, y, 'merchants'), house(2, x + 3, y, 'settlers')]))!
    expect(mixed.paved[y * SIZE + x + 2]).toBe(0)
  })

  it('is worked out again only when the houses change, and says where it changed', () => {
    const [x, y] = placeWith('citizens', 'flags')
    const state = town([house(1, x, y, 'settlers')])
    expect(townGround(state)).toBeNull()
    const risen = { ...state, buildings: [house(1, x, y, 'citizens')] }
    const ground = townGround(risen)!
    expect(townGround({ ...risen })).toBe(ground)
    // the pictures of the ground follow the code of their tiles: it changes with the paving, and nowhere else
    const tiles = [y * SIZE + x, y * SIZE + x - 1, 3 * SIZE + 3]
    expect(layoutSignature(tiles, state.occupancy, state.roads, ground.code)).not.toBe(layoutSignature(tiles, state.occupancy, state.roads, null))
    expect(layoutSignature([3 * SIZE + 3], state.occupancy, state.roads, ground.code)).toBe(layoutSignature([3 * SIZE + 3], state.occupancy, state.roads, null))
  })

  it('reads the paving between the middles of the tiles, and lays a slab whole or not at all', () => {
    const paved = new Float32Array(SIZE * SIZE)
    paved[5 * SIZE + 5] = 1
    expect(pavedAt(paved, SIZE, SIZE, 5.5, 5.5)).toBe(1)
    expect(pavedAt(paved, SIZE, SIZE, 6, 5.5)).toBeCloseTo(0.5, 6)
    expect(pavedAt(paved, SIZE, SIZE, 7.5, 5.5)).toBe(0)
    expect(pavedAt(paved, SIZE, SIZE, -3, -3)).toBe(0)
    expect(slabLaid(1, 0)).toBe(true)
    expect(slabLaid(0, 1)).toBe(false)
    // at the edge of the paving a slab's own number decides: the flags end in whole slabs, not in a line
    expect(slabLaid(0.5, 0.9)).toBe(true)
    expect(slabLaid(0.5, 0.1)).toBe(false)
  })
})

describe('stone flags', () => {
  const at = (u: number, v: number): Flag => {
    const flag: Flag = { r: 0, g: 0, b: 0, body: 0, cu: 0, cv: 0, pick: 0 }
    flagAt(u, v, flag)
    return flag
  }

  it('repeat without a seam after a few tiles', () => {
    for (const [u, v] of [[0.13, 0.71], [1.4, 2.9], [3.77, 0.05]]) {
      const here = at(u, v)
      for (const [du, dv] of [[FLAG_TILES, 0], [0, -FLAG_TILES]]) {
        const there = at(u + du, v + dv)
        expect([there.r, there.g, there.b, there.body, there.pick]).toEqual([here.r, here.g, here.b, here.body, here.pick])
        // the same slab one repeat further on: its middle lies one repeat further on too
        expect(there.cu - du).toBeCloseTo(here.cu, 6)
        expect(there.cv - dv).toBeCloseTo(here.cv, 6)
      }
    }
  })

  it('are slabs with joints between them: many slabs of many tones, each one whole', () => {
    const slabs = new Map<number, number>()
    let joints = 0
    let stone = 0
    const n = 160
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const flag = at((i + 0.5) * (FLAG_TILES / n), (j + 0.5) * (FLAG_TILES / n))
        expect(flag.body).toBeGreaterThanOrEqual(0)
        expect(flag.body).toBeLessThanOrEqual(1)
        if (flag.body < 0.2) joints++
        if (flag.body > 0.95) {
          stone++
          slabs.set(Math.round(flag.pick * 1e6), flag.r + flag.g + flag.b)
        }
      }
    }
    expect(joints / (n * n)).toBeGreaterThan(0.03)
    expect(stone / (n * n)).toBeGreaterThan(0.6)
    // about fifteen slabs to a tile
    expect(slabs.size).toBeGreaterThan(FLAG_TILES * FLAG_TILES * 10)
    const tones = [...slabs.values()]
    expect(Math.max(...tones) - Math.min(...tones)).toBeGreaterThan(60)
    // the middle of a slab lies on that slab
    const here = at(1.31, 2.47)
    expect(at(here.cu, here.cv).pick).toBe(here.pick)
    expect(at(here.cu, here.cv).body).toBe(1)
  })
})

describe('the enclosure of a garden', () => {
  it('runs along the whole side, or leaves a gate before the door', () => {
    expect(stretches(0.07, 1.93)).toEqual([[0.07, 1.93]])
    const open = stretches(0.07, 1.93, 1)
    expect(open).toHaveLength(2)
    expect(open[0][1]).toBeLessThan(1)
    expect(open[1][0]).toBeGreaterThan(1)
    // the gate is wide enough for a cart of barrels to be carried through: a third of a tile
    expect(open[1][0] - open[0][1]).toBeCloseTo(0.34, 6)
    // a gate at the very end of a side leaves no stub of hedge beside it
    expect(stretches(0.07, 1.93, 0.2)).toHaveLength(1)
  })
})

describe('gardens on free tiles beside rich houses', () => {
  it('lie inside a low wall as often as inside a hedge, from the merchants on', () => {
    const houses = (tier: string): PlacedBuilding[] => Array.from({ length: 16 }, (_, i) => house(i + 1, 4 + (i % 4) * 8, 4 + Math.floor(i / 4) * 8, tier))
    const kinds = (tier: string): number[] => gardenItems(town(houses(tier))).filter((entry) => entry.item.kind === 'garden').map((entry) => entry.item.variant)
    expect(kinds('citizens').includes(5)).toBe(false)
    const rich = kinds('merchants')
    expect(rich.includes(5)).toBe(true)
    expect(rich.includes(4)).toBe(true)
  })
})
