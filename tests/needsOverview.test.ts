import { describe, expect, it } from 'vitest'
import { chains } from '../src/data'
import { builtCount, chainSeparator, chainsFor, MATERIALS, needsByTier, supplyOf } from '../src/game/needsOverview'
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
