import { describe, expect, it } from 'vitest'
import { changesBetween } from '../src/render/effects'
import type { PlacedBuilding } from '../src/sim/state'
import { createHouse } from '../src/sim/tiers'

const house = (id: number, tier: string, ruin = false): PlacedBuilding => ({ id, type: 'house_pioneers', x: id * 2, y: 0, rotated: false, active: true, house: { ...createHouse(tier), ruin } })
const farm = (id: number): PlacedBuilding => ({ id, type: 'sheep_farm', x: id * 2, y: 4, rotated: false, active: true })

describe('map effects', () => {
  it('finds new buildings', () => {
    const { built, risen } = changesBetween([farm(1)], [farm(1), farm(2), house(3, 'pioneers')])
    expect(built.map((b) => b.id)).toEqual([2, 3])
    expect(risen).toEqual([])
  })

  it('finds houses that rose a tier, not those that fell or turned into ruins', () => {
    const before = [house(1, 'pioneers'), house(2, 'citizens'), house(3, 'merchants'), house(4, 'settlers')]
    const after = [house(1, 'settlers'), house(2, 'settlers'), house(3, 'aristocrats', true), house(4, 'settlers')]
    const { built, risen } = changesBetween(before, after)
    expect(built).toEqual([])
    expect(risen.map((b) => b.id)).toEqual([1])
  })

  it('ignores demolished buildings', () => {
    expect(changesBetween([farm(1), farm(2)], [farm(2)])).toEqual({ built: [], risen: [] })
  })
})
