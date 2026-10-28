import { describe, expect, it } from 'vitest'
import { BuildController } from '../src/game/buildController'
import { GameLoop } from '../src/game/gameLoop'
import { liftIsland } from '../src/sim/islands'
import { createNewGame } from '../src/sim/newGame'
import { testIsland } from './helpers'

function setup() {
  const loop = new GameLoop(liftIsland(testIsland({ coins: 10_000, stock: { tools: 100, wood: 100, bricks: 100, marble: 10 } })))
  return { loop, tool: new BuildController(loop) }
}

describe('BuildController on the phone', () => {
  it('puts a new ghost on a free spot near the middle of the view', () => {
    const { tool } = setup()
    tool.setViewCenter(() => ({ x: 6, y: 6 }))
    tool.startPlacing('forester')
    expect(tool.getSnapshot().center).toEqual({ x: 6, y: 6 })
    expect(tool.getSnapshot().origin).not.toBeNull()
  })

  it('drags the ghost with the finger, keeping where it was held', () => {
    const { tool } = setup()
    tool.startPlacing('forester')
    tool.setCenter({ x: 6, y: 6 })
    expect(tool.grab({ x: 6, y: 6 })).toBe(true)
    tool.grabMove({ x: 8, y: 7 })
    expect(tool.getSnapshot().center).toEqual({ x: 8, y: 7 })
    expect(tool.grabRelease()).toBe(true)
  })

  it('does not take a touch far away from the ghost (that pans the map) and reports an unmoved grab as a tap', () => {
    const { tool } = setup()
    tool.startPlacing('forester')
    tool.setCenter({ x: 6, y: 6 })
    expect(tool.grab({ x: 12, y: 12 })).toBe(false)
    expect(tool.grab({ x: 6, y: 6 })).toBe(true)
    expect(tool.grabRelease()).toBe(false)
  })

  it('builds where the map is tapped, and only moves the ghost where it cannot be built', () => {
    const loop = new GameLoop(createNewGame(1))
    const tool = new BuildController(loop)
    const count = (): number => loop.getIslandState().buildings.length
    const before = count()
    const kontor = loop.getIslandState().buildings.find((b) => b.type === 'kontor')!
    tool.setViewCenter(() => ({ x: kontor.x, y: kontor.y }))
    tool.startPlacing('house_pioneers')
    const spot = tool.getSnapshot().center!
    tool.placeAt(spot)
    expect(count()).toBe(before + 1)
    expect(tool.getSnapshot().mode).toBe('place') // houses can follow each other
    tool.placeAt(spot) // taken now: nothing is built, the ghost waits there
    expect(count()).toBe(before + 1)
    expect(tool.getSnapshot().center).toEqual(spot)
  })

  it('does not build a house out of reach of the trading post with a tap, only with "Build"', () => {
    const { loop, tool } = setup() // this island has no trading post: every spot is out of reach
    tool.startPlacing('house_pioneers')
    tool.placeAt({ x: 6, y: 6 })
    expect(loop.getIslandState().buildings).toHaveLength(0)
    expect(tool.getSnapshot().center).toEqual({ x: 6, y: 6 })
    tool.confirm()
    expect(loop.getIslandState().buildings).toHaveLength(1)
  })

  it('lets the ghost follow the mouse', () => {
    const { tool } = setup()
    tool.startPlacing('forester')
    tool.hover({ x: 7, y: 5 })
    expect(tool.getSnapshot().center).toEqual({ x: 7, y: 5 })
    tool.cancel()
    tool.hover({ x: 3, y: 3 }) // not placing: nothing happens
    expect(tool.getSnapshot().center).toBeNull()
  })

  it('plans a road from a new producer to the trading post, ready to build', () => {
    const loop = new GameLoop(createNewGame(1))
    const tool = new BuildController(loop)
    const kontor = loop.getIslandState().buildings.find((b) => b.type === 'kontor')!
    tool.setViewCenter(() => ({ x: kontor.x, y: kontor.y }))
    tool.startPlacing('weaver')
    tool.confirm()
    const weaver = loop.getIslandState().buildings.find((b) => b.type === 'weaver')!
    tool.startRoadFrom(weaver.id)
    expect(tool.getSnapshot().mode).toBe('road')
    expect(tool.getSnapshot().route.plan?.reachable).toBe(true)
    tool.routeConfirm()
    loop.fastForward(2)
    const after = loop.getIslandState().buildings.find((b) => b.id === weaver.id)!
    expect(after.production?.status.kind).not.toBe('noRoad')
  })

  it('takes the last building back for its full cost', () => {
    const { loop, tool } = setup()
    const coins = loop.getIslandState().coins
    tool.startPlacing('forester')
    tool.setCenter({ x: 6, y: 6 })
    tool.confirm()
    expect(loop.getIslandState().buildings).toHaveLength(1)
    expect(tool.getSnapshot().undo?.label).toBe('Forsthaus')
    tool.undo()
    expect(loop.getIslandState().buildings).toHaveLength(0)
    expect(loop.getIslandState().coins).toBe(coins)
    expect(tool.getSnapshot().undo).toBeNull()
  })

  it('keeps the undo across tool changes but not after it was dropped', () => {
    const { loop, tool } = setup()
    tool.startPlacing('forester')
    tool.setCenter({ x: 6, y: 6 })
    tool.confirm()
    tool.cancel()
    expect(tool.getSnapshot().undo).not.toBeNull()
    tool.dropUndo()
    tool.undo()
    expect(loop.getIslandState().buildings).toHaveLength(1)
  })

  it('remembers what was built last, newest first', () => {
    const { tool } = setup()
    tool.startPlacing('forester')
    tool.setCenter({ x: 6, y: 6 })
    tool.confirm()
    tool.startPlacing('house_pioneers')
    tool.setCenter({ x: 3, y: 3 })
    tool.confirm()
    expect(tool.getSnapshot().recent.slice(0, 2)).toEqual(['house_pioneers', 'forester'])
  })
})
