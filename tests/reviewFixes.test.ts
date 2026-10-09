import { describe, expect, it } from 'vitest'
import { EMPTY_ROUTE, grabRoute, moveRoute, tapRoute } from '../src/game/routeDraft'
import { demolishAt, demolishPreview, placeBuilding, placeRoads } from '../src/sim/build'
import { getLinks } from '../src/sim/logistics'
import { taxOf } from '../src/sim/market'
import { createHouse } from '../src/sim/tiers'
import { grassField, patchBuilding, testIsland } from './helpers'

const rich = { coins: 1_000_000, stock: { tools: 900, wood: 900, bricks: 900, marble: 90 }, fertilities: ['forest'] }

describe('links to a shut down hub', () => {
  it('a producer does not deliver to a market house that is shut down', () => {
    let state = grassField(40, 12, rich)
    state = placeBuilding(state, 'market_house', 2, 2, false)
    state = placeBuilding(state, 'forester', 8, 2, false)
    state = placeRoads(state, [4, 5, 6, 7].map((x) => ({ x, y: 3 })))
    expect(getLinks(state).get(2)?.kind).toBe('ok')
    const off = patchBuilding(state, 1, { active: false })
    expect(getLinks(off).get(2)?.kind).toBe('noHub')
    expect(getLinks(patchBuilding(off, 1, { active: true })).get(2)?.kind).toBe('ok')
  })
})

describe('demolishing', () => {
  it('does nothing on an island that is not yours', () => {
    const built = placeBuilding(testIsland(), 'house_pioneers', 3, 3, false)
    const foreign = { ...built, owned: false }
    expect(demolishAt(foreign, 3, 3)).toBe(foreign)
  })
})

describe('demolish preview', () => {
  it('counts each building once, counts road tiles and adds up half the costs', () => {
    let state = placeBuilding(testIsland(), 'house_pioneers', 3, 3, false)
    state = placeRoads(state, [{ x: 6, y: 3 }, { x: 7, y: 3 }])
    const preview = demolishPreview(state, [{ x: 3, y: 3 }, { x: 4, y: 4 }, { x: 6, y: 3 }, { x: 7, y: 3 }, { x: 9, y: 9 }])
    expect(preview.buildings).toHaveLength(1)
    expect(preview.roads).toBe(2)
    expect(preview.refund.coins).toBe(50 + 2 * 2)
  })
})

describe('route dragging', () => {
  it('does not plan again while the finger stays on the same tile', () => {
    const state = testIsland()
    let draft = tapRoute(state, tapRoute(state, EMPTY_ROUTE, { x: 3, y: 3 }), { x: 9, y: 3 })
    draft = grabRoute(draft, { x: 9, y: 3 })!
    expect(moveRoute(state, draft, { x: 9, y: 3 })).toBe(draft)
  })
})

describe('land tax of a house', () => {
  it('is zero for ruins and empty houses and grows with the met goods needs', () => {
    const house = { ...createHouse('pioneers'), residents: 8 }
    const none = taxOf({ ...house, needs: { food: 0, cloth: 0, chapel: 100 } })
    const half = taxOf({ ...house, needs: { food: 100, cloth: 0, chapel: 100 } })
    const full = taxOf({ ...house, needs: { food: 100, cloth: 100, chapel: 100 } })
    expect(none).toBeGreaterThan(0)
    expect(half).toBeGreaterThan(none)
    expect(full).toBeGreaterThan(half)
    expect(taxOf({ ...house, residents: 0 })).toBe(0)
    expect(taxOf({ ...house, ruin: true })).toBe(0)
  })
})
