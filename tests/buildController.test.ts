import { describe, expect, it } from 'vitest'
import { BuildController } from '../src/game/buildController'
import { GameLoop } from '../src/game/gameLoop'
import { liftIsland } from '../src/sim/islands'
import { testIsland } from './helpers'

function setup() {
  const loop = new GameLoop(liftIsland(testIsland()))
  return { loop, tool: new BuildController(loop) }
}

describe('BuildController', () => {
  it('centres the ghost on the tapped tile and recomputes it when rotated', () => {
    const { tool } = setup()
    tool.startPlacing('chapel') // 2 wide, 3 high
    tool.setCenter({ x: 6, y: 6 })
    expect(tool.getSnapshot().origin).toEqual({ x: 5, y: 5 })
    tool.rotate() // 3 wide, 2 high
    expect(tool.getSnapshot().origin).toEqual({ x: 5, y: 5 })
  })

  it('has no ghost until a tile was tapped and cannot confirm then', () => {
    const { loop, tool } = setup()
    tool.startPlacing('house_pioneers')
    expect(tool.getSnapshot().origin).toBeNull()
    tool.confirm()
    expect(loop.getIslandState().buildings).toHaveLength(0)
  })

  it('builds on confirm, stays in placing mode and clears the ghost', () => {
    const { loop, tool } = setup()
    tool.startPlacing('house_pioneers')
    tool.setCenter({ x: 5, y: 5 })
    tool.confirm()
    expect(loop.getIslandState().buildings).toHaveLength(1)
    expect(tool.getSnapshot().mode).toBe('place')
    expect(tool.getSnapshot().origin).toBeNull()
  })

  it('does not build on an invalid spot', () => {
    const { loop, tool } = setup()
    tool.startPlacing('house_pioneers')
    tool.setCenter({ x: 0, y: 0 }) // water
    tool.confirm()
    expect(loop.getIslandState().buildings).toHaveLength(0)
  })

  it('draws a road along the drag and applies it on release', () => {
    const { loop, tool } = setup()
    tool.startRoads()
    tool.setFreehand(true)
    tool.strokeStart({ x: 3, y: 3 })
    tool.strokeMove({ x: 6, y: 3 })
    expect(tool.getSnapshot().stroke).toHaveLength(4)
    expect(loop.getIslandState().roads.some((v) => v === 1)).toBe(false)
    tool.strokeEnd()
    expect(loop.getIslandState().roads.filter((v) => v === 1)).toHaveLength(4)
    expect(tool.getSnapshot().stroke).toHaveLength(0)
  })

  it('demolishes along the drag', () => {
    const { loop, tool } = setup()
    tool.startRoads()
    tool.setFreehand(true)
    tool.strokeStart({ x: 3, y: 3 })
    tool.strokeMove({ x: 5, y: 3 })
    tool.strokeEnd()
    tool.startDemolish()
    tool.strokeStart({ x: 3, y: 3 })
    tool.strokeMove({ x: 5, y: 3 })
    tool.strokeEnd()
    expect(loop.getIslandState().roads.some((v) => v === 1)).toBe(false)
  })

  it('cancel returns to idle', () => {
    const { tool } = setup()
    tool.startPlacing('chapel')
    tool.cancel()
    expect(tool.getSnapshot().mode).toBe('none')
    expect(tool.drawing).toBe(false)
  })

  it('selects a building only while no tool is active', () => {
    const { tool } = setup()
    tool.selectBuilding(3)
    expect(tool.getSnapshot().selectedBuildingId).toBe(3)
    tool.startRoads()
    expect(tool.getSnapshot().selectedBuildingId).toBeNull()
    tool.selectBuilding(4)
    expect(tool.getSnapshot().selectedBuildingId).toBeNull()
    tool.cancel()
    tool.selectBuilding(4)
    tool.selectBuilding(null)
    expect(tool.getSnapshot().selectedBuildingId).toBeNull()
  })

  it('shuts a building down and starts it again', () => {
    const { loop, tool } = setup()
    tool.startPlacing('forester')
    tool.setCenter({ x: 5, y: 5 })
    tool.confirm()
    const id = loop.getIslandState().buildings[0].id
    tool.setActive(id, false)
    expect(loop.getIslandState().buildings[0].active).toBe(false)
    tool.setActive(id, true)
    expect(loop.getIslandState().buildings[0].active).toBe(true)
  })
})
