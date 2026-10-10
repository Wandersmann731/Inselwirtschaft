import { describe, expect, it } from 'vitest'
import { BuildController } from '../src/game/buildController'
import { GameLoop } from '../src/game/gameLoop'
import { liftIsland } from '../src/sim/islands'
import { blocksAlong, buildSettlement, planSettlement } from '../src/sim/settlementPlanner'
import { yardAt, yardField } from '../src/world/settlement'
import { grassField, testIsland } from './helpers'

const rich = { coins: 1_000_000, stock: { tools: 900, wood: 900, bricks: 900, marble: 90 } }

describe('settlement planner', () => {
  it('fills the area with houses that never overlap and stay inside', () => {
    const state = grassField(30, 30, rich)
    const plan = planSettlement(state, 'house_pioneers', { x: 4, y: 4 }, { x: 15, y: 13 })
    expect(plan.origins.length).toBeGreaterThan(8)
    const taken = new Set<string>()
    for (const o of plan.origins) {
      expect(o.x).toBeGreaterThanOrEqual(4)
      expect(o.y).toBeGreaterThanOrEqual(4)
      expect(o.x + 1).toBeLessThanOrEqual(15)
      expect(o.y + 1).toBeLessThanOrEqual(13)
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const key = `${o.x + dx},${o.y + dy}`
        expect(taken.has(key)).toBe(false)
        taken.add(key)
      }
    }
  })

  it('splits a length into blocks of two or three houses with one lane between them', () => {
    expect(blocksAlong(9, 2, 3, 1)).toEqual([[0, 2], [5, 2]])
    expect(blocksAlong(6, 2, 3, 1)).toEqual([[0, 3]])
    expect(blocksAlong(3, 2, 3, 1)).toEqual([[0, 1]])
    expect(blocksAlong(1, 2, 3, 1)).toEqual([])
  })

  it('puts the houses of a block side by side and keeps the same one-tile lane between blocks', () => {
    const state = grassField(40, 30, rich)
    const plan = planSettlement(state, 'house_pioneers', { x: 2, y: 2 }, { x: 20, y: 10 })
    const xs = [...new Set(plan.origins.map((o) => o.x))].sort((p, q) => p - q)
    const steps = new Set(xs.slice(1).map((x, i) => x - xs[i]))
    // 2 within a block (houses touch), 3 across a lane
    expect([...steps].every((step) => step === 2 || step === 3)).toBe(true)
    expect(steps.has(3)).toBe(true)
  })

  it('gives the houses of one block the same quarter, the id of its first house', () => {
    const state = grassField(40, 30, rich)
    const plan = planSettlement(state, 'house_pioneers', { x: 2, y: 2 }, { x: 14, y: 6 })
    const houses = plan.result.buildings.filter((b) => b.house)
    expect(houses.every((b) => b.quarter !== undefined)).toBe(true)
    for (const block of new Set(plan.blocks)) {
      const members = houses.filter((_, i) => plan.blocks[i] === block)
      expect(new Set(members.map((b) => b.quarter)).size).toBe(1)
      expect(members[0].quarter).toBe(members[0].id)
    }
    expect(new Set(houses.map((b) => b.quarter)).size).toBe(new Set(plan.blocks).size)
    const built = buildSettlement(state, 'house_pioneers', plan.origins, plan.blocks)
    expect(built.buildings.map((b) => b.quarter)).toEqual(houses.map((b) => b.quarter))
  })

  it('gives the same layout twice and stops when the money runs out', () => {
    const state = grassField(30, 30, rich)
    const a = planSettlement(state, 'house_pioneers', { x: 2, y: 2 }, { x: 25, y: 20 })
    const b = planSettlement(state, 'house_pioneers', { x: 2, y: 2 }, { x: 25, y: 20 })
    expect(b.origins).toEqual(a.origins)
    const poor = planSettlement(grassField(30, 30, { ...rich, coins: 350 }), 'house_pioneers', { x: 2, y: 2 }, { x: 25, y: 20 })
    expect(poor.origins).toHaveLength(3)
    expect(poor.outOfMoney).toBe(true)
  })

  it('skips water and the mountain', () => {
    const state = testIsland(rich)
    const plan = planSettlement(state, 'house_pioneers', { x: 0, y: 0 }, { x: 19, y: 13 })
    for (const o of plan.origins) {
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const terrain = state.map.tiles[(o.y + dy) * state.map.width + o.x + dx]
        expect(terrain === 2 || terrain === 1 || terrain === 3).toBe(true)
      }
    }
  })
})

describe('area tool in the controller', () => {
  function setup() {
    const loop = new GameLoop(liftIsland(grassField(30, 30, rich)))
    return { loop, tool: new BuildController(loop) }
  }

  it('plans while dragging and builds all houses on confirm', () => {
    const { loop, tool } = setup()
    tool.startPlacing('house_pioneers')
    tool.setAreaMode(true)
    expect(tool.inputMode).toBe('draw')
    tool.strokeStart({ x: 3, y: 3 })
    tool.strokeMove({ x: 14, y: 10 })
    tool.strokeEnd()
    const planned = tool.getSnapshot().area!.origins.length
    expect(planned).toBeGreaterThan(5)
    expect(loop.getIslandState().buildings).toHaveLength(0)
    tool.confirm()
    expect(loop.getIslandState().buildings).toHaveLength(planned)
    expect(tool.getSnapshot().mode).toBe('place')
  })

  it('is only for houses', () => {
    const { tool } = setup()
    tool.startPlacing('forester')
    tool.setAreaMode(true)
    expect(tool.getSnapshot().areaMode).toBe(false)
  })
})

describe('back to the overview', () => {
  it('after a production building and after a road, but not after a house', () => {
    const loop = new GameLoop(liftIsland(grassField(30, 30, { ...rich, fertilities: ['forest'] })))
    const tool = new BuildController(loop)
    tool.startPlacing('house_pioneers')
    tool.setCenter({ x: 5, y: 5 })
    tool.confirm()
    expect(tool.getSnapshot().mode).toBe('place')
    tool.startPlacing('weaver')
    tool.setCenter({ x: 10, y: 10 })
    tool.confirm()
    expect(loop.getIslandState().buildings).toHaveLength(2)
    expect(tool.getSnapshot().mode).toBe('none')
    tool.startRoads()
    tool.routeTap({ x: 3, y: 15 })
    tool.routeTap({ x: 8, y: 15 })
    tool.routeConfirm()
    expect(tool.getSnapshot().mode).toBe('none')
  })
})

describe('village yard', () => {
  it('is strong on house tiles, fades with distance and is zero far away', () => {
    const state = grassField(20, 20)
    const occupancy = new Array(400).fill(0)
    occupancy[10 * 20 + 10] = 7
    const field = yardField(state.map, occupancy, new Set([7]))
    expect(yardAt(field, 20, 20, 10.5, 10.5)).toBeCloseTo(1, 1)
    expect(yardAt(field, 20, 20, 12.5, 10.5)).toBeLessThan(yardAt(field, 20, 20, 11.5, 10.5))
    expect(yardAt(field, 20, 20, 17.5, 3.5)).toBe(0)
  })

  it('merges between two houses with a gap', () => {
    const state = grassField(20, 20)
    const occupancy = new Array(400).fill(0)
    occupancy[10 * 20 + 6] = 7
    occupancy[10 * 20 + 9] = 8
    const field = yardField(state.map, occupancy, new Set([7, 8]))
    expect(yardAt(field, 20, 20, 7.5, 10.5)).toBeGreaterThan(0.3)
    expect(yardAt(field, 20, 20, 8.5, 10.5)).toBeGreaterThan(0.3)
  })
})
