import { describe, expect, it } from 'vitest'
import { config, getBuilding, tiers } from '../src/data'
import { checkPlacement, placeBuilding } from '../src/sim/build'
import { runPopulation } from '../src/sim/population'
import { createRng } from '../src/sim/rng'
import type { IslandState } from '../src/sim/state'
import { tickFlat as tick, cycleFlat, placeUnlocked } from './helpers'
import { isBuildingUnlocked, residentsFromTier, residentsOfTier } from '../src/sim/tiers'
import { grassField, patchHouse } from './helpers'

const rich = { coins: 1_000_000, stock: { tools: 500, wood: 500, bricks: 500, marble: 50 } }
const { upgradeCycles, downgradeCycles, ruinCycles, moveInPerCycle, moveOutPerCycle } = config.population

const ALL_MET = { food: 100, cloth: 100, chapel: 100 }
const SHORT = { food: 0, cloth: 100, chapel: 100 }

/** One house (id 1) on an otherwise empty field. */
function oneHouse(): IslandState {
  return { ...placeBuilding(grassField(30, 30, rich), 'house_pioneers', 10, 10, false), highestTier: 0 }
}

const house = (state: IslandState) => state.buildings.find((b) => b.house)!.house!
const cycles = (state: IslandState, n: number): IslandState => {
  let next = state
  for (let i = 0; i < n; i++) next = runPopulation(next)
  return next
}

describe('moving in and out', () => {
  it('fills the house step by step up to the tier capacity', () => {
    let state = patchHouse(oneHouse(), 1, { needs: ALL_MET })
    state = runPopulation(state)
    expect(house(state).residents).toBe(moveInPerCycle)
    state = runPopulation(state)
    expect(house(state).residents).toBe(8)
    expect(house(state).tier).toBe('pioneers')
  })

  it('does not let anyone move in during shortage and lets residents leave', () => {
    const state = patchHouse(oneHouse(), 1, { needs: SHORT, residents: 5 })
    expect(house(runPopulation(state)).residents).toBe(5 - moveOutPerCycle)
    const empty = patchHouse(oneHouse(), 1, { needs: SHORT, residents: 0 })
    expect(house(runPopulation(empty)).residents).toBe(0)
  })
})

describe('rising a tier', () => {
  const ready = (): IslandState => patchHouse(oneHouse(), 1, { needs: ALL_MET, residents: 8 })

  it('rises to settlers after the upgrade delay if all needs are met and materials are there', () => {
    let state = cycles(ready(), upgradeCycles - 1)
    expect(house(state).tier).toBe('pioneers')
    state = runPopulation(state)
    expect(house(state).tier).toBe('settlers')
    expect(state.highestTier).toBe(1)
  })

  it('uses up the building materials', () => {
    const cost = tiers[1].upgradeCost!
    const state = cycles(ready(), upgradeCycles)
    expect(state.stock.wood).toBe(ready().stock.wood - cost.wood)
    expect(state.stock.tools).toBe(ready().stock.tools - cost.tools)
  })

  it('waits for missing materials and rises as soon as they arrive', () => {
    const noWood = { ...ready(), stock: { ...ready().stock, wood: 0 } }
    const stuck = cycles(noWood, upgradeCycles + 3)
    expect(house(stuck).tier).toBe('pioneers')
    expect(house(stuck).missingMaterials).toBe(true)
    const fixed = runPopulation({ ...stuck, stock: { ...stuck.stock, wood: 10 } })
    expect(house(fixed).tier).toBe('settlers')
    expect(house(fixed).missingMaterials).toBe(false)
  })

  it('does not rise if a single need is below 100 %', () => {
    const state = patchHouse(ready(), 1, { needs: { ...ALL_MET, cloth: 99 } })
    expect(house(cycles(state, 6)).tier).toBe('pioneers')
    expect(house(cycles(state, 6)).upgradeTimer).toBe(0)
  })

  it('does not rise while the house is not full', () => {
    const state = patchHouse(ready(), 1, { residents: 4 })
    // 4 move in per cycle, so it is full after the first cycle; check the very first one
    expect(house(runPopulation(state)).upgradeTimer).toBe(1)
    const lower = patchHouse(ready(), 1, { residents: 1 })
    expect(house(runPopulation(lower)).upgradeTimer).toBe(0)
  })

  it('does not rise from merchants to aristocrats', () => {
    const state = patchHouse(ready(), 1, { tier: 'merchants', residents: 42, needs: { x: 100 } })
    expect(house(cycles(state, 10)).tier).toBe('merchants')
  })

  it('gets bigger capacity in the new tier', () => {
    const state = patchHouse(cycles(ready(), upgradeCycles), 1, { needs: { ...ALL_MET, alcohol: 100, salt: 100, tavern: 100 } })
    const filled = cycles(state, 2)
    expect(house(filled).tier).toBe('settlers')
    expect(house(filled).residents).toBeGreaterThan(8)
    expect(house(filled).residents).toBeLessThanOrEqual(15)
  })
})

describe('falling a tier', () => {
  it('falls back one tier after the shortage delay and cuts the residents to the new capacity', () => {
    let state = patchHouse(oneHouse(), 1, { tier: 'settlers', needs: SHORT, residents: 15, shortageTimer: 0 })
    state = cycles(state, downgradeCycles - 1)
    expect(house(state).tier).toBe('settlers')
    state = runPopulation(state)
    expect(house(state).tier).toBe('pioneers')
    expect(house(state).residents).toBeLessThanOrEqual(8)
  })

  it('keeps pioneers as pioneers', () => {
    const state = patchHouse(oneHouse(), 1, { needs: SHORT, residents: 8 })
    expect(house(cycles(state, 20)).tier).toBe('pioneers')
  })

  it('resets the shortage timer when the shortage ends', () => {
    let state = patchHouse(oneHouse(), 1, { tier: 'settlers', needs: SHORT, residents: 15 })
    state = cycles(state, downgradeCycles - 1)
    state = patchHouse(state, 1, { needs: ALL_MET })
    state = runPopulation(state)
    expect(house(state).shortageTimer).toBe(0)
    expect(house(state).tier).toBe('settlers')
  })
})

describe('aristocrats', () => {
  const aristocrat = (needs: Record<string, number>): IslandState =>
    patchHouse(oneHouse(), 1, { tier: 'aristocrats', residents: 30, needs })

  it('turns into a ruin after a short shortage instead of falling back', () => {
    let state = aristocrat({ jewelry: 100, wine: 100, theater: 0 })
    state = cycles(state, ruinCycles - 1)
    expect(house(state).ruin).toBe(false)
    state = runPopulation(state)
    expect(house(state).ruin).toBe(true)
    expect(house(state).tier).toBe('aristocrats')
    expect(house(state).residents).toBe(0)
  })

  it('does not care when jewelry and wine are missing, they only raise the tax', () => {
    const state = cycles(aristocrat({ jewelry: 0, wine: 0, theater: 100 }), 20)
    expect(house(state).ruin).toBe(false)
    expect(house(state).residents).toBe(30)
  })

  it('stays alive while everything is delivered', () => {
    const state = cycles(aristocrat({ jewelry: 100, wine: 100, theater: 100 }), 20)
    expect(house(state).ruin).toBe(false)
    expect(house(state).residents).toBe(30)
  })

  it('stays a ruin and does not take residents', () => {
    let state = cycles(aristocrat({ theater: 0 }), ruinCycles)
    state = patchHouse(state, 1, { needs: { theater: 100 } })
    expect(house(cycles(state, 5)).ruin).toBe(true)
    expect(house(cycles(state, 5)).residents).toBe(0)
  })
})

describe('unlocking', () => {
  it('only offers pioneer buildings at the start', () => {
    const fresh = { ...grassField(10, 10), highestTier: 0 }
    expect(isBuildingUnlocked(fresh, 'house_pioneers')).toBe(true)
    expect(isBuildingUnlocked(fresh, 'tavern')).toBe(false)
    expect(checkPlacement(fresh, 'tavern', 2, 2, false)?.code).toBe('locked')
  })

  it('unlocks the next tier once a house has risen', () => {
    const risen = cycles(patchHouse(oneHouse(), 1, { needs: ALL_MET, residents: 8 }), upgradeCycles)
    expect(isBuildingUnlocked(risen, 'tavern')).toBe(true)
    expect(isBuildingUnlocked(risen, 'church')).toBe(false)
  })

  it('keeps the unlock when a house falls back', () => {
    const state = { ...oneHouse(), highestTier: 2 }
    expect(isBuildingUnlocked(state, 'distillery')).toBe(true)
  })

  it('opens public buildings only from a resident threshold (chapel: pioneers)', () => {
    const needed = getBuilding('chapel').unlock!.residents
    const few = patchHouse(oneHouse(), 1, { residents: needed - 1 })
    expect(isBuildingUnlocked(few, 'chapel')).toBe(false)
    expect(checkPlacement(few, 'chapel', 2, 2, false)?.code).toBe('locked')
    const many = patchHouse(oneHouse(), 1, { residents: needed })
    expect(isBuildingUnlocked(many, 'chapel')).toBe(true)
  })

  it('counts residents of higher tiers towards a threshold, so rising houses do not lock it again', () => {
    const needed = getBuilding('church').unlock!.residents
    const settlers = { ...patchHouse(oneHouse(), 1, { tier: 'settlers', residents: needed }), highestTier: 2 }
    expect(residentsFromTier(settlers, 'settlers')).toBe(needed)
    expect(isBuildingUnlocked(settlers, 'church')).toBe(true)
    const citizens = patchHouse(settlers, 1, { tier: 'citizens' })
    expect(isBuildingUnlocked(citizens, 'church')).toBe(true)
    expect(isBuildingUnlocked(patchHouse(settlers, 1, { residents: needed - 1 }), 'church')).toBe(false)
  })

  it('allows aristocrat houses only with 1900 merchant residents', () => {
    let state = { ...grassField(40, 40, rich), highestTier: 3 }
    expect(checkPlacement(state, 'house_aristocrats', 10, 10, false)?.code).toBe('locked')
    state = placeBuilding(state, 'house_pioneers', 2, 2, false)
    state = patchHouse(state, 1, { tier: 'merchants', residents: 1899 })
    expect(residentsOfTier(state, 'merchants')).toBe(1899)
    expect(checkPlacement(state, 'house_aristocrats', 10, 10, false)?.code).toBe('locked')
    state = patchHouse(state, 1, { residents: 1900 })
    expect(checkPlacement(state, 'house_aristocrats', 10, 10, false)).toBeNull()
  })

  it('builds aristocrat houses as 2x2 in the aristocrat tier', () => {
    expect(getBuilding('house_aristocrats').size).toEqual([2, 2])
    let state = { ...grassField(40, 40, rich), highestTier: 3 }
    state = placeBuilding(state, 'house_pioneers', 2, 2, false)
    state = patchHouse(state, 1, { tier: 'merchants', residents: 1900 })
    state = placeBuilding(state, 'house_aristocrats', 10, 10, false)
    expect(state.buildings[1].house?.tier).toBe('aristocrats')
  })
})

describe('economy cycle in the tick', () => {
  it('runs market and population exactly every economyCycleTicks', () => {
    let state = patchHouse(oneHouse(), 1, { needs: ALL_MET })
    state = { ...state, tick: config.economyCycleTicks - 2 }
    state = tick(state, createRng(1))
    expect(house(state).residents).toBe(0)
    state = tick(state, createRng(1))
    expect(state.tick).toBe(config.economyCycleTicks)
    // the market ran first and found no stands, so the house is in shortage and nobody moves in
    expect(house(state).needs.food).toBe(0)
  })

  it('lets a supplied village grow from pioneers to settlers without player action', () => {
    let state = grassField(50, 30, rich)
    state = placeBuilding(state, 'house_pioneers', 10, 10, false)
    state = placeBuilding(state, 'market_house', 14, 10, false)
    state = placeUnlocked(state, 'chapel', 20, 10, false)
    state = { ...state, stock: { ...state.stock, food: 1000, cloth: 1000 } }
    state = { ...state, highestTier: 0 }
    for (let i = 0; i < config.economyCycleTicks * 6; i++) state = tick(state, createRng(state.rngState))
    expect(house(state).tier).toBe('settlers')
    expect(state.highestTier).toBe(1)
    expect(state.economy.last!.income).toBeGreaterThan(0)
  })

  it('earns money from the residents', () => {
    let state = patchHouse(oneHouse(), 1, { needs: ALL_MET, residents: 8 })
    state = placeBuilding(state, 'market_house', 14, 10, false)
    const before = { ...state, stock: { ...state.stock, food: 100, cloth: 100 } }
    expect(cycleFlat(before).coins).toBeGreaterThan(before.coins)
  })
})

describe('stopping upgrades at the market house', () => {
  it('a stopped tier is not reached and no materials are used', async () => {
    const { setUpgradeStop } = await import('../src/sim/population')
    const ready = patchHouse(oneHouse(), 1, { needs: ALL_MET, residents: 8 })
    const stopped = setUpgradeStop(ready, 'settlers', true)
    const after = cycles(stopped, upgradeCycles + 2)
    expect(house(after).tier).toBe('pioneers')
    expect(after.stock.wood).toBe(stopped.stock.wood)
    const allowed = cycles(setUpgradeStop(stopped, 'settlers', false), upgradeCycles)
    expect(house(allowed).tier).toBe('settlers')
    expect(setUpgradeStop(ready, 'settlers', false)).toBe(ready)
  })
})

describe('needs only for rising', () => {
  it('keeps pioneers without a chapel (they only need it to rise), but does not let them rise', () => {
    const met = { ...ALL_MET, chapel: 0 }
    const after = cycles(patchHouse(oneHouse(), 1, { needs: met, residents: 8 }), upgradeCycles + 2)
    expect(house(after).residents).toBe(8)
    expect(house(after).tier).toBe('pioneers')
  })

  it('still lets pioneers move out when food is missing', () => {
    const after = cycles(patchHouse(oneHouse(), 1, { needs: { ...ALL_MET, food: 0 }, residents: 8 }), 1)
    expect(house(after).residents).toBeLessThan(8)
  })
})
