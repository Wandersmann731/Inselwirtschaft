import { describe, expect, it } from 'vitest'
import { config, getBuilding } from '../src/data'
import { placeBuilding, placeRoads } from '../src/sim/build'
import { processProduction, setBuildingActive, upkeepOf } from '../src/sim/production'
import { createRng } from '../src/sim/rng'
import type { GameState } from '../src/sim/state'
import { tick } from '../src/sim/tick'
import { grassField } from './helpers'

const rich = { coins: 1_000_000, stock: { tools: 500, wood: 500, bricks: 500, marble: 50 } }

function run(state: GameState, ticks: number): GameState {
  let next = state
  for (let i = 0; i < ticks; i++) next = tick(next, createRng(next.rngState))
  return next
}

function roadRow(state: GameState, y: number, fromX: number, toX: number): GameState {
  const tiles = []
  for (let x = fromX; x <= toX; x++) tiles.push({ x, y })
  return placeRoads(state, tiles)
}

/** Market house at (2,2) 3x3, producer to its right, a road between them along y = 3. */
function connected(producer: string, stockOverride: Record<string, number> = {}): GameState {
  let state = grassField(40, 12, rich)
  state = placeBuilding(state, 'market_house', 2, 2, false)
  state = placeBuilding(state, producer, 8, 2, false)
  state = roadRow(state, 3, 5, 7)
  return { ...state, stock: { ...state.stock, ...stockOverride } }
}

const forester = (state: GameState) => state.buildings.find((b) => b.type === 'forester')!
const find = (state: GameState, type: string) => state.buildings.find((b) => b.type === type)!

describe('producer without inputs (forester)', () => {
  it('delivers wood to the island store after its cycle and the road delay', () => {
    const start = connected('forester', { wood: 0 })
    const cycle = getBuilding('forester').cycleTicks!
    const early = run(start, cycle - 2)
    expect(early.stock.wood).toBe(0)
    const later = run(start, cycle + 20)
    expect(later.stock.wood).toBeGreaterThanOrEqual(1)
    expect(forester(later).production!.status.kind).toBe('producing')
  })

  it('keeps producing without any player action', () => {
    const start = connected('forester', { wood: 0 })
    const result = run(start, 300)
    expect(result.stock.wood).toBeGreaterThanOrEqual(8)
  })

  it('delivers later over a longer road', () => {
    const base = grassField(40, 12, rich)
    const noWood = (state: GameState): GameState => ({ ...state, stock: { ...state.stock, wood: 0 } })
    const near = noWood(
      roadRow(placeBuilding(placeBuilding(base, 'market_house', 2, 2, false), 'forester', 8, 2, false), 3, 5, 7),
    )
    const farBase = placeBuilding(placeBuilding(base, 'market_house', 2, 2, false), 'forester', 20, 2, false)
    const far = noWood(roadRow(farBase, 3, 5, 19))
    const arrival = (state: GameState): number => {
      let s = state
      for (let i = 1; i <= 200; i++) {
        s = tick(s, createRng(s.rngState))
        if (s.stock.wood > 0) return i
      }
      return Infinity
    }
    expect(arrival(far)).toBeGreaterThan(arrival(near))
    expect(arrival(far) - arrival(near)).toBe(12 * config.production.ticksPerRoadTile)
  })
})

describe('link status', () => {
  it('reports no road if the producer is not connected to the hub by road', () => {
    let state = grassField(40, 12, rich)
    state = placeBuilding(state, 'market_house', 2, 2, false)
    state = placeBuilding(state, 'forester', 8, 2, false)
    const result = run(state, 5)
    expect(forester(result).production!.status.kind).toBe('noRoad')
    expect(result.stock.wood).toBe(state.stock.wood)
  })

  it('reports no road if the road ends before the hub', () => {
    let state = grassField(40, 12, rich)
    state = placeBuilding(state, 'market_house', 2, 2, false)
    state = placeBuilding(state, 'forester', 8, 2, false)
    state = roadRow(state, 3, 6, 7)
    expect(forester(run(state, 5)).production!.status.kind).toBe('noRoad')
  })

  it('reports out of range if no hub reaches the producer', () => {
    let state = grassField(70, 12, rich)
    state = placeBuilding(state, 'market_house', 2, 2, false)
    state = placeBuilding(state, 'forester', 50, 2, false)
    state = roadRow(state, 3, 5, 49)
    expect(forester(run(state, 5)).production!.status.kind).toBe('noHub')
  })

  it('treats a Kontor like a market house', () => {
    let state = grassField(40, 12, rich)
    // grass has no water: turn the column left of the Kontor into sea
    state = {
      ...state,
      map: { ...state.map, tiles: state.map.tiles.map((t, i) => (i % 40 === 0 ? 0 : t)) },
    }
    state = placeBuilding(state, 'kontor', 1, 1, false)
    expect(state.buildings).toHaveLength(1)
    state = placeBuilding(state, 'forester', 8, 2, false)
    state = roadRow(state, 3, 4, 7)
    const result = run(state, 60)
    expect(forester(result).production!.status.kind).toBe('producing')
  })
})

describe('inputs', () => {
  it('waits for wool and says so', () => {
    const start = connected('weaver', { wool: 0, cotton: 0 })
    const result = run(start, 10)
    expect(find(result, 'weaver').production!.status).toEqual({ kind: 'waiting', good: 'wool' })
    expect(result.stock.cloth ?? 0).toBe(0)
  })

  it('weaves wool into cloth', () => {
    const start = connected('weaver', { wool: 10, cotton: 0, cloth: 0 })
    const result = run(start, 150)
    expect(result.stock.cloth).toBeGreaterThanOrEqual(2)
    expect(result.stock.wool).toBeLessThan(10)
  })

  it('accepts cotton instead of wool', () => {
    const start = connected('weaver', { wool: 0, cotton: 10, cloth: 0 })
    const result = run(start, 150)
    expect(result.stock.cloth).toBeGreaterThanOrEqual(2)
    expect(result.stock.cotton).toBeLessThan(10)
  })

  it('needs all inputs of a multi-input producer', () => {
    const noIron = connected('toolmaker', { iron: 0, tools: 0 })
    expect(find(run(noIron, 20), 'toolmaker').production!.status).toEqual({ kind: 'waiting', good: 'iron' })
    const noWood = connected('toolmaker', { iron: 10, wood: 0, tools: 0 })
    expect(find(run(noWood, 20), 'toolmaker').production!.status).toEqual({ kind: 'waiting', good: 'wood' })
    const both = connected('toolmaker', { iron: 10, wood: 10, tools: 0 })
    expect(run(both, 120).stock.tools).toBeGreaterThanOrEqual(1)
  })

  it('takes goods from the island store when ordering them', () => {
    const start = connected('weaver', { wool: 10, cotton: 0 })
    const result = run(start, 3)
    const weaver = find(result, 'weaver').production!
    const held = (weaver.inputs.wool ?? 0) + weaver.shipments.filter((s) => s.kind === 'in').reduce((n, s) => n + s.amount, 0)
    expect(held + result.stock.wool).toBeLessThanOrEqual(10)
    expect(result.stock.wool).toBeLessThan(10)
  })
})

describe('full store', () => {
  it('stops with a full output buffer when the island store is full', () => {
    const start = connected('forester', { wood: config.production.stockCapacity })
    const result = run(start, 400)
    expect(forester(result).production!.status.kind).toBe('outputFull')
    expect(result.stock.wood).toBe(config.production.stockCapacity)
  })

  it('resumes once goods are taken from the store', () => {
    const full = run(connected('forester', { wood: config.production.stockCapacity }), 400)
    const resumed = run({ ...full, stock: { ...full.stock, wood: 0 } }, 60)
    expect(forester(resumed).production!.status.kind).toBe('producing')
    expect(resumed.stock.wood).toBeGreaterThan(0)
  })
})

describe('shutting down', () => {
  it('stops producing and reports the building as inactive', () => {
    const start = connected('forester', { wood: 0 })
    const off = setBuildingActive(start, forester(start).id, false)
    const result = run(off, 200)
    expect(result.stock.wood).toBe(0)
    expect(forester(result).production!.status.kind).toBe('inactive')
  })

  it('starts again when switched back on', () => {
    const start = connected('forester', { wood: 0 })
    const off = setBuildingActive(start, forester(start).id, false)
    const on = setBuildingActive(run(off, 20), forester(off).id, true)
    expect(run(on, 100).stock.wood).toBeGreaterThan(0)
  })

  it('lowers the upkeep to the idle value', () => {
    const start = connected('forester')
    const def = getBuilding('forester')
    expect(upkeepOf(forester(start))).toBe(def.upkeep.active)
    const off = setBuildingActive(start, forester(start).id, false)
    expect(upkeepOf(forester(off))).toBe(def.upkeep.idle)
    expect(def.upkeep.idle).toBeLessThan(def.upkeep.active)
  })

  it('keeps the state object when nothing changes', () => {
    const start = connected('forester')
    expect(setBuildingActive(start, forester(start).id, true)).toBe(start)
    expect(setBuildingActive(start, 999, false)).toBe(start)
  })
})

describe('chains', () => {
  it('runs wood and cloth chains side by side over one road net', () => {
    let state = grassField(40, 14, rich)
    state = placeBuilding(state, 'market_house', 2, 2, false)
    state = placeBuilding(state, 'forester', 8, 2, false)
    state = placeBuilding(state, 'sheep_farm', 12, 2, false)
    state = placeBuilding(state, 'weaver', 16, 2, false)
    state = roadRow(state, 5, 4, 17)
    state = placeRoads(state, [{ x: 5, y: 4 }, { x: 9, y: 4 }, { x: 13, y: 4 }, { x: 17, y: 4 }])
    const result = run({ ...state, stock: { ...state.stock, wood: 0, wool: 0, cloth: 0 } }, 600)
    expect(result.stock.wood).toBeGreaterThan(0)
    expect(result.stock.cloth).toBeGreaterThan(0)
  })

  it('does not touch buildings without production', () => {
    const state = connected('forester')
    const house = placeBuilding(state, 'house_pioneers', 30, 5, false)
    const result = processProduction(house)
    expect(result.buildings.find((b) => b.type === 'house_pioneers')).toEqual(
      house.buildings.find((b) => b.type === 'house_pioneers'),
    )
  })
})
