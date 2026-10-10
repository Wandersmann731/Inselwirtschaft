import { describe, expect, it } from 'vitest'
import { getBuilding } from '../src/data'
import { demolishBuilding, placeBuilding, placeRoads } from '../src/sim/build'
import { buildSettlement } from '../src/sim/settlementPlanner'
import { recordBuild, undoBuild } from '../src/sim/undo'
import { testIsland } from './helpers'

const rich = { coins: 10_000, stock: { tools: 100, wood: 100, bricks: 100, marble: 10 } }

describe('undo of a build action', () => {
  it('removes the building and pays the full cost back', () => {
    const before = testIsland(rich)
    const after = placeBuilding(before, 'forester', 3, 3, false)
    const record = recordBuild(before, after)!
    expect(record.buildingIds).toHaveLength(1)
    const undone = undoBuild(after, record)
    expect(undone.buildings).toHaveLength(0)
    expect(undone.coins).toBe(before.coins)
    expect(undone.stock).toEqual(before.stock)
    expect(undone.occupancy.every((id) => id === 0)).toBe(true)
    expect(undone.economy.current.consumed.wood ?? 0).toBe(0)
  })

  it('takes back a whole quarter of houses at once', () => {
    const before = testIsland(rich)
    const after = buildSettlement(before, 'house_pioneers', [{ x: 2, y: 2 }, { x: 5, y: 2 }])
    const undone = undoBuild(after, recordBuild(before, after)!)
    expect(undone.buildings).toHaveLength(0)
    expect(undone.coins).toBe(before.coins)
  })

  it('removes new road tiles but keeps roads that were there before', () => {
    const start = placeRoads(testIsland(rich), [{ x: 2, y: 2 }])
    const after = placeRoads(start, [{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }])
    const record = recordBuild(start, after)!
    expect(record.roadTiles).toHaveLength(2)
    const undone = undoBuild(after, record)
    expect(undone.roads).toEqual(start.roads)
    expect(undone.coins).toBe(start.coins)
    expect(getBuilding('road').cost.coins).toBeGreaterThan(0)
  })

  it('skips what was demolished in between and records nothing when nothing was built', () => {
    const before = testIsland(rich)
    const after = placeBuilding(before, 'forester', 3, 3, false)
    const record = recordBuild(before, after)!
    const razed = demolishBuilding(after, record.buildingIds[0])
    expect(undoBuild(razed, record)).toBe(razed)
    expect(recordBuild(before, before)).toBeNull()
  })
})
