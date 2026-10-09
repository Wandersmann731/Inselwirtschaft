import { describe, expect, it } from 'vitest'
import { BuildController } from '../src/game/buildController'
import { GameLoop } from '../src/game/gameLoop'
import { grabRoute, moveRoute, tapRoute, EMPTY_ROUTE } from '../src/game/routeDraft'
import { placeBuilding, placeRoads } from '../src/sim/build'
import { liftIsland } from '../src/sim/islands'
import { anchorTiles, planRoute } from '../src/sim/roadPlanner'
import { testIsland } from './helpers'

const turns = (tiles: { x: number; y: number }[]): number => {
  let count = 0
  for (let i = 2; i < tiles.length; i++) {
    const a = { x: tiles[i - 1].x - tiles[i - 2].x, y: tiles[i - 1].y - tiles[i - 2].y }
    const b = { x: tiles[i].x - tiles[i - 1].x, y: tiles[i].y - tiles[i - 1].y }
    if (a.x !== b.x || a.y !== b.y) count++
  }
  return count
}

describe('road planner', () => {
  it('proposes a connected route with few turns between two points', () => {
    const plan = planRoute(testIsland(), { x: 3, y: 3 }, { x: 10, y: 4 })
    expect(plan.reachable).toBe(true)
    expect(plan.tiles[0]).toEqual({ x: 3, y: 3 })
    expect(plan.tiles[plan.tiles.length - 1]).toEqual({ x: 10, y: 4 })
    expect(plan.tiles).toHaveLength(9) // shortest: 7 + 1 steps + start
    expect(turns(plan.tiles)).toBe(1)
    for (let i = 1; i < plan.tiles.length; i++) {
      const d = Math.abs(plan.tiles[i].x - plan.tiles[i - 1].x) + Math.abs(plan.tiles[i].y - plan.tiles[i - 1].y)
      expect(d).toBe(1)
    }
  })

  it('never runs over the mountain', () => {
    const state = testIsland()
    const plan = planRoute(state, { x: 3, y: 8 }, { x: 14, y: 10 })
    expect(plan.reachable).toBe(true)
    for (const tile of plan.tiles) expect(state.map.tiles[tile.y * state.map.width + tile.x]).not.toBe(4)
  })

  it('reuses existing roads and only counts the rest as new', () => {
    let state = testIsland()
    state = placeRoads(state, [{ x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 }])
    const plan = planRoute(state, { x: 3, y: 3 }, { x: 8, y: 3 })
    expect(plan.tiles).toHaveLength(6)
    expect(plan.newTiles).toHaveLength(3)
  })

  it('ends next to a building when a building is the target', () => {
    const state = placeBuilding(testIsland(), 'market_house', 10, 3, false)
    expect(state.buildings).toHaveLength(1)
    const anchors = anchorTiles(state, { x: 10, y: 3 })
    expect(anchors.length).toBeGreaterThan(0)
    const plan = planRoute(state, { x: 3, y: 3 }, { x: 10, y: 3 })
    expect(plan.reachable).toBe(true)
    const last = plan.tiles[plan.tiles.length - 1]
    expect(state.occupancy[last.y * state.map.width + last.x]).toBe(0)
  })

  it('reports an unreachable target', () => {
    const plan = planRoute(testIsland(), { x: 3, y: 3 }, { x: 0, y: 0 })
    expect(plan.reachable).toBe(false)
    expect(plan.tiles).toHaveLength(0)
  })

  it('bends the route through a waypoint', () => {
    const state = testIsland()
    const plan = planRoute(state, { x: 3, y: 3 }, { x: 10, y: 3 }, [{ x: 6, y: 1 }])
    expect(plan.tiles.some((t) => t.x === 6 && t.y === 1)).toBe(true)
    expect(plan.segments).toHaveLength(2)
  })
})

describe('route draft', () => {
  it('takes start, then end, and plans', () => {
    const state = testIsland()
    let draft = tapRoute(state, EMPTY_ROUTE, { x: 3, y: 3 })
    expect(draft.start).toEqual({ x: 3, y: 3 })
    expect(draft.plan).toBeNull()
    draft = tapRoute(state, draft, { x: 8, y: 3 })
    expect(draft.plan?.tiles).toHaveLength(6)
  })

  it('ignores a tap on water', () => {
    expect(tapRoute(testIsland(), EMPTY_ROUTE, { x: 0, y: 0 })).toBe(EMPTY_ROUTE)
  })

  it('pulling the route out adds a waypoint and moves it', () => {
    const state = testIsland()
    let draft = tapRoute(state, tapRoute(state, EMPTY_ROUTE, { x: 3, y: 3 }), { x: 9, y: 3 })
    draft = grabRoute(draft, { x: 6, y: 3 })!
    expect(draft.via).toHaveLength(1)
    draft = moveRoute(state, draft, { x: 6, y: 1 })
    expect(draft.plan?.tiles.some((t) => t.x === 6 && t.y === 1)).toBe(true)
    // A spot with no way through (water) is ignored.
    expect(moveRoute(state, draft, { x: 0, y: 0 })).toBe(draft)
  })

  it('grabs nothing far away from the route', () => {
    const state = testIsland()
    const draft = tapRoute(state, tapRoute(state, EMPTY_ROUTE, { x: 3, y: 3 }), { x: 9, y: 3 })
    expect(grabRoute(draft, { x: 6, y: 8 })).toBeNull()
  })
})

describe('route in the build controller', () => {
  it('builds the planned route on confirm, only the new tiles are paid', () => {
    const loop = new GameLoop(liftIsland(testIsland()))
    const tool = new BuildController(loop)
    tool.startRoads()
    expect(tool.inputMode).toBe('pan')
    tool.routeTap({ x: 3, y: 3 })
    tool.routeTap({ x: 8, y: 3 })
    expect(tool.inputMode).toBe('grab')
    expect(loop.getIslandState().roads.some((v) => v === 1)).toBe(false)
    tool.routeConfirm()
    expect(loop.getIslandState().roads.filter((v) => v === 1)).toHaveLength(6)
    expect(tool.getSnapshot().route.plan).toBeNull()
  })

  it('switches to freehand drawing', () => {
    const tool = new BuildController(new GameLoop(liftIsland(testIsland())))
    tool.startRoads()
    tool.setFreehand(true)
    expect(tool.inputMode).toBe('draw')
  })
})
