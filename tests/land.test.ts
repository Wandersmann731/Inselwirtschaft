import { describe, expect, it } from 'vitest'
import { buildings, climates, getBuilding, tiers, world } from '../src/data'
import { buildingBlocker, checkPlacement, checkRoad, placeBuilding, placeRoads } from '../src/sim/build'
import { createRng } from '../src/sim/rng'
import { generateWorld } from '../src/world/worldGenerator'
import { grassField, tickFlat } from './helpers'

const rich = { coins: 1_000_000, stock: { tools: 500, wood: 500, bricks: 500, marble: 50 } }

describe('fertility and deposit rules', () => {
  it('only allows a plantation on islands with the matching fertility', () => {
    const withTobacco = grassField(30, 30, { ...rich, fertilities: ['tobacco'], highestTier: 3 })
    const without = grassField(30, 30, { ...rich, fertilities: ['sheep'], highestTier: 3 })
    expect(checkPlacement(withTobacco, 'tobacco_plantation', 5, 5, false)).toBeNull()
    expect(checkPlacement(without, 'tobacco_plantation', 5, 5, false)).toEqual({ code: 'noFertility', missing: 'tobacco' })
    expect(placeBuilding(without, 'tobacco_plantation', 5, 5, false)).toBe(without)
  })

  it('needs the deposit for mines even on a mountain', () => {
    const state = (deposits: string[]) => ({
      ...grassField(30, 30, { ...rich, deposits, highestTier: 3 }),
    })
    const mountain = (s: ReturnType<typeof state>) => ({
      ...s,
      map: { ...s.map, tiles: s.map.tiles.map(() => 4) },
    })
    expect(checkPlacement(mountain(state(['gold'])), 'gold_mine', 5, 5, false)).toBeNull()
    expect(checkPlacement(mountain(state(['stone'])), 'gold_mine', 5, 5, false)).toEqual({
      code: 'noDeposit',
      missing: 'gold',
    })
  })

  it('builds the whaler only at the coast of an island with whales', () => {
    let state = grassField(30, 30, { ...rich, fertilities: ['whales'], highestTier: 3 })
    state = { ...state, map: { ...state.map, tiles: state.map.tiles.map((t, i) => (i % 30 === 0 ? 0 : t)) } }
    expect(checkPlacement(state, 'whaler', 1, 5, false)).toBeNull()
    expect(checkPlacement(state, 'whaler', 10, 5, false)?.code).toBe('notCoast')
    expect(checkPlacement({ ...state, fertilities: [] }, 'whaler', 1, 5, false)?.code).toBe('noFertility')
  })

  it('lets nothing be built on an island that is not yours, roads included', () => {
    const foreign = grassField(30, 30, { ...rich, owned: false })
    expect(checkPlacement(foreign, 'house_pioneers', 5, 5, false)).toEqual({ code: 'notOwned' })
    expect(checkRoad(foreign, 5, 5)).toEqual({ code: 'notOwned' })
    expect(placeRoads(foreign, [{ x: 5, y: 5 }])).toBe(foreign)
  })

  it('reports the blocker independent of the spot', () => {
    const state = grassField(30, 30, { ...rich, fertilities: [], highestTier: 0 })
    expect(buildingBlocker(state, getBuilding('forester'))?.code).toBe('noFertility')
    expect(buildingBlocker(state, getBuilding('tavern'))?.code).toBe('locked')
    expect(buildingBlocker(state, getBuilding('house_pioneers'))).toBeNull()
  })
})

describe('the data hangs together', () => {
  const fertilities = new Set(climates.flatMap((climate) => climate.fertilities))
  const deposits = new Set(world.archipelago.flatMap((spec) => spec.deposits))
  const made = new Set(buildings.flatMap((def) => (def.output ? [def.output.good, ...(def.byproducts ?? []).map((extra) => extra.good)] : [])))

  it('only asks for fertilities that some climate has and deposits that some island has', () => {
    for (const def of buildings) {
      if (def.requiresFertility) expect(fertilities.has(def.requiresFertility), def.id).toBe(true)
      if (def.requiresDeposit) expect(deposits.has(def.requiresDeposit), def.id).toBe(true)
    }
  })

  it('makes every input of every producer in some building (or has it in the start stock)', () => {
    for (const def of buildings) {
      for (const input of def.inputs ?? []) {
        expect(made.has(input.good), `${def.id} needs ${input.good}`).toBe(true)
        for (const alternative of input.alternatives ?? []) expect(made.has(alternative), `${def.id} alt ${alternative}`).toBe(true)
      }
    }
  })

  it('lets residents buy every good they need from a stand and has a producer for it', () => {
    const sold = new Set(buildings.flatMap((def) => def.sells ?? []))
    for (const tier of tiers) {
      for (const need of tier.needs) {
        if (need.building) {
          expect(buildings.some((def) => def.id === need.building), need.id).toBe(true)
          continue
        }
        expect(sold.has(need.good!), `${need.id} is sold`).toBe(true)
        expect(made.has(need.good!), `${need.id} is made`).toBe(true)
      }
    }
  })

  it('has a producer for every good that has a price', () => {
    for (const def of buildings.flatMap((entry) => entry.sells ?? [])) expect(made.has(def), def).toBe(true)
  })

  it('has fertilities that can be mined or grown somewhere in the archipelago for every producer', () => {
    const all = generateWorld(1).islands
    for (const def of buildings) {
      if (!def.requiresFertility && !def.requiresDeposit) continue
      const possible = all.some(
        (island) =>
          (!def.requiresFertility || island.fertilities.includes(def.requiresFertility)) &&
          (!def.requiresDeposit || island.deposits.includes(def.requiresDeposit)),
      )
      expect(possible, def.id).toBe(true)
    }
  })

  it('keeps the home island short of some goods: it cannot make everything', () => {
    const home = generateWorld(1).islands[0]
    const impossible = buildings.filter(
      (def) =>
        (def.requiresFertility && !home.fertilities.includes(def.requiresFertility)) ||
        (def.requiresDeposit && !home.deposits.includes(def.requiresDeposit)),
    )
    const lost = new Set(impossible.flatMap((def) => (def.output ? [def.output.good] : [])))
    for (const good of ['tobacco_leaf', 'spices', 'raw_silk', 'dye', 'blubber', 'gold', 'gems']) {
      expect(lost.has(good), good).toBe(true)
    }
  })
})

describe('new chains', () => {
  function connected(producer: string, stockOverride: Record<string, number> = {}) {
    let state = grassField(40, 12, { ...rich, highestTier: 3 })
    state = placeBuilding(state, 'market_house', 2, 2, false)
    state = placeBuilding(state, producer, 8, 2, false)
    state = placeRoads(state, [4, 5, 6, 7].map((x) => ({ x, y: 3 })))
    return { ...state, stock: { ...state.stock, ...stockOverride } }
  }
  const run = (state: ReturnType<typeof connected>, ticks: number) => {
    let next = state
    for (let i = 0; i < ticks; i++) next = tickFlat(next, createRng(next.rngState))
    return next
  }

  it('needs both raw silk and dye for the dyer', () => {
    const noDye = run(connected('dyer', { raw_silk: 10, dye: 0, silk: 0 }), 20)
    expect(noDye.buildings.find((b) => b.type === 'dyer')!.production!.status).toEqual({ kind: 'waiting', good: 'dye' })
    const both = run(connected('dyer', { raw_silk: 10, dye: 10, silk: 0 }), 120)
    expect(both.stock.silk).toBeGreaterThanOrEqual(1)
  })

  it('makes alcohol from sugar in the rum distillery and from hops in the brewery', () => {
    expect(run(connected('distillery', { sugar: 10, alcohol: 0 }), 120).stock.alcohol).toBeGreaterThanOrEqual(1)
    expect(run(connected('brewery', { hops: 10, alcohol: 0 }), 120).stock.alcohol).toBeGreaterThanOrEqual(1)
    expect(run(connected('brewery', { hops: 0, alcohol: 0 }), 60).stock.alcohol ?? 0).toBe(0)
  })

  it('goes from tobacco leaves to tobacco and from blubber to lamp oil', () => {
    expect(run(connected('tobacco_factory', { tobacco_leaf: 10, tobacco: 0 }), 100).stock.tobacco).toBeGreaterThanOrEqual(1)
    expect(run(connected('oil_boiler', { blubber: 10, lamp_oil: 0 }), 100).stock.lamp_oil).toBeGreaterThanOrEqual(1)
  })

  it('makes jewelry only from gold and gems together', () => {
    expect(run(connected('goldsmith', { gold: 10, gems: 0, jewelry: 0 }), 60).stock.jewelry ?? 0).toBe(0)
    expect(run(connected('goldsmith', { gold: 10, gems: 10, jewelry: 0 }), 150).stock.jewelry).toBeGreaterThanOrEqual(1)
  })

  it('tans hides into leather', () => {
    expect(run(connected('tannery', { hides: 10, leather: 0 }), 100).stock.leather).toBeGreaterThanOrEqual(1)
  })
})
