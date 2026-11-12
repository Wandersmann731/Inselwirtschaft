import { describe, expect, it } from 'vitest'
import { chains } from '../src/data'
import { builtCount, chainGoodOf, chainSeparator, chainsFor, MATERIALS, needsByTier, supplyOf, waitingToRise } from '../src/game/needsOverview'
import { placeBuilding } from '../src/sim/build'
import { grassField, patchHouse } from './helpers'

const rich = { coins: 1_000_000, stock: { tools: 900, wood: 900, bricks: 900, marble: 90 } }

describe('needs overview of the production menu', () => {
  it('shows the reached tiers and the next one as a locked preview', () => {
    const tiers = needsByTier(grassField(10, 10, { highestTier: 0 }))
    expect(tiers.map((t) => t.tierId)).toEqual(['pioneers', 'settlers'])
    expect(tiers[0].locked).toBe(false)
    expect(tiers[1].locked).toBe(true)
    expect(tiers[0].goods.map((g) => g.good)).toEqual(['food', 'cloth'])
    expect(tiers[0].goods[1].alternatives).toEqual(['leather'])
  })

  it('marks jewelry and wine as a bonus', () => {
    const tiers = needsByTier(grassField(10, 10, { highestTier: 4 }))
    const aristocrats = tiers[tiers.length - 1]
    expect(aristocrats.goods.every((g) => g.optional)).toBe(true)
  })

  it('finds the chains for a good, its alternatives and substitutes', () => {
    const food = chainsFor('food').map((c) => c.chain.id)
    expect(food).toEqual(expect.arrayContaining(['fish', 'bread', 'meat']))
    const cloth = chainsFor('cloth', ['leather'])
    expect(cloth.find((c) => c.chain.id === 'leather')?.role).toBe('alternative')
    const tobacco = chainsFor('tobacco', [], ['salt'])
    expect(tobacco.find((c) => c.chain.id === 'salt')?.role).toBe('substitute')
  })

  it('has a chain for every good residents ask for and for every material', () => {
    for (const tier of needsByTier(grassField(10, 10, { highestTier: 4 }))) {
      for (const need of tier.goods) expect(chainsFor(need.good).length, need.good).toBeGreaterThan(0)
    }
    for (const material of MATERIALS) expect(chains.some((c) => c.goods.includes(material)), material).toBe(true)
  })

  it('averages the supply over inhabited houses and counts buildings', () => {
    let state = grassField(30, 30, rich)
    state = placeBuilding(state, 'house_pioneers', 2, 2, false)
    state = placeBuilding(state, 'house_pioneers', 6, 2, false)
    expect(supplyOf(state, 'food')).toBeNull()
    state = patchHouse(state, 1, { residents: 8, needs: { food: 100 } })
    state = patchHouse(state, 2, { residents: 8, needs: { food: 50 } })
    expect(supplyOf(state, 'food')).toBe(75)
    expect(builtCount(state, 'house_pioneers')).toBe(2)
  })

  it('tells steps, joint inputs and alternatives apart between chain buildings', () => {
    const chain = (id: string) => chains.find((c) => c.id === id)!
    const seps = (id: string) => chain(id).buildings.slice(1).map((_, i) => chainSeparator(chain(id), i + 1))
    expect(seps('bread')).toEqual(['›', '›'])
    expect(seps('cloth')).toEqual(['oder', '›'])
    expect(seps('silk')).toEqual(['+', '›'])
    expect(seps('jewelry')).toEqual(['+', '›'])
    expect(seps('alcohol')).toEqual(['oder', '›', 'oder', '›'])
    expect(seps('meat')).toEqual(['›', 'oder'])
  })
})

describe('the chain a warning leads to', () => {
  it('is the good itself when a chain is named after it', () => {
    expect(chainGoodOf('food')).toBe('food')
    expect(chainGoodOf('tools')).toBe('tools')
  })

  it('is the finished good for something made on the way', () => {
    expect(chainGoodOf('wool')).toBe('cloth')
    expect(chainGoodOf('iron')).toBe('tools')
    expect(chainGoodOf('flour')).toBe('food')
  })

  it('is nothing for an unknown good', () => {
    expect(chainGoodOf('moon dust')).toBeNull()
  })
})

describe('houses waiting to rise', () => {
  const village = () => {
    let state = grassField(20, 20, { ...rich })
    state = placeBuilding(state, 'house_pioneers', 2, 2, false)
    state = placeBuilding(state, 'house_pioneers', 6, 2, false)
    return state
  }

  it('counts the houses that lack materials and names what the store is short of', () => {
    let state = village()
    state = patchHouse(state, 1, { missingMaterials: true })
    state = patchHouse(state, 2, { missingMaterials: true })
    // rising to settlers takes tools and wood: no tools left, plenty of wood
    const waiting = waitingToRise({ ...state, stock: { ...state.stock, tools: 0 } })
    expect(waiting.houses).toBe(2)
    expect(waiting.goods).toEqual(['tools'])
  })

  it('is empty when no house waits', () => {
    expect(waitingToRise(village())).toEqual({ houses: 0, goods: [] })
  })
})

