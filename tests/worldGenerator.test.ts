import { describe, expect, it } from 'vitest'
import { climates, world } from '../src/data'
import { fromIslandState, getIsland, liftIsland, onEachIsland, onIsland, toIslandState } from '../src/sim/islands'
import { createInitialState } from '../src/sim/state'
import { Terrain } from '../src/world/terrain'
import { generateWorld } from '../src/world/worldGenerator'

const SEEDS = [1, 2, 3, 42, 777]

describe('generateWorld', () => {
  it('makes every island of the archipelago with its climate and fertilities', () => {
    const { islands } = generateWorld(1)
    expect(islands.map((island) => island.name)).toEqual(world.archipelago.map((spec) => spec.name))
    islands.forEach((island, index) => {
      const spec = world.archipelago[index]
      expect(island.id).toBe(index)
      expect(island.climate).toBe(spec.climate)
      expect(island.fertilities).toEqual(climates.find((c) => c.id === spec.climate)!.fertilities)
      expect(island.deposits).toEqual(spec.deposits)
      expect(island.map.width).toBeGreaterThanOrEqual(spec.size[0])
      expect(island.map.width).toBeLessThanOrEqual(spec.size[1])
    })
  })

  it('only owns the home island and gives colonies an empty store', () => {
    const { islands } = generateWorld(1)
    expect(islands.filter((island) => island.owned).map((island) => island.role)).toEqual(['home'])
    for (const island of islands.slice(1)) expect(island.stock).toEqual({})
  })

  it('places islands inside the world map without touching each other', () => {
    for (const seed of SEEDS) {
      const { world: chart } = generateWorld(seed)
      expect(chart.cells).toHaveLength(chart.width * chart.height)
      for (const p of chart.placements) {
        expect(p.x).toBeGreaterThanOrEqual(world.sea.islandGap)
        expect(p.y).toBeGreaterThanOrEqual(world.sea.islandGap)
        expect(p.x + p.w).toBeLessThanOrEqual(chart.width - world.sea.islandGap)
        expect(p.y + p.h).toBeLessThanOrEqual(chart.height - world.sea.islandGap)
      }
      chart.placements.forEach((a, i) =>
        chart.placements.slice(i + 1).forEach((b) => {
          const apart =
            a.x + a.w + world.sea.islandGap <= b.x ||
            b.x + b.w + world.sea.islandGap <= a.x ||
            a.y + a.h + world.sea.islandGap <= b.y ||
            b.y + b.h + world.sea.islandGap <= a.y
          expect(apart, `seed ${seed}: islands ${a.id} and ${b.id}`).toBe(true)
        }),
      )
    }
  })

  it('marks land cells with the island id and leaves a free sea around the islands', () => {
    const { islands, world: chart } = generateWorld(2)
    for (const island of islands) {
      const p = chart.placements.find((entry) => entry.id === island.id)!
      let landCells = 0
      for (let y = p.y; y < p.y + p.h; y++) {
        for (let x = p.x; x < p.x + p.w; x++) {
          const cell = chart.cells[y * chart.width + x]
          if (cell !== 0) {
            expect(cell).toBe(island.id + 1)
            landCells++
          }
        }
      }
      expect(landCells).toBeGreaterThan(10)
    }
    // the outermost ring is open sea so ships can sail around everything
    for (let x = 0; x < chart.width; x++) {
      expect(chart.cells[x]).toBe(0)
      expect(chart.cells[(chart.height - 1) * chart.width + x]).toBe(0)
    }
  })

  it('has land under each marked cell', () => {
    const { islands, world: chart } = generateWorld(3)
    const cellTiles = world.sea.cellTiles
    const island = islands[0]
    const p = chart.placements[0]
    for (let y = p.y; y < p.y + p.h; y++) {
      for (let x = p.x; x < p.x + p.w; x++) {
        const marked = chart.cells[y * chart.width + x] === 1
        let hasLand = false
        for (let ty = (y - p.y) * cellTiles; ty < Math.min(island.map.height, (y - p.y + 1) * cellTiles); ty++) {
          for (let tx = (x - p.x) * cellTiles; tx < Math.min(island.map.width, (x - p.x + 1) * cellTiles); tx++) {
            if (island.map.tiles[ty * island.map.width + tx] !== Terrain.Water) hasLand = true
          }
        }
        expect(marked).toBe(hasLand)
      }
    }
  })

  it('cannot make every good on the home island', () => {
    const home = generateWorld(1).islands[0]
    for (const missing of ['tobacco', 'spices', 'silk', 'cotton']) expect(home.fertilities).not.toContain(missing)
  })

  it('lets the colonies cover what the home island lacks', () => {
    const { islands } = generateWorld(1)
    const all = new Set(islands.flatMap((island) => island.fertilities))
    for (const needed of ['tobacco', 'spices', 'silk', 'cotton', 'wine']) expect(all.has(needed)).toBe(true)
    const deposits = new Set(islands.flatMap((island) => island.deposits))
    for (const needed of ['gold', 'gems', 'ore', 'salt']) expect(deposits.has(needed)).toBe(true)
  })
})

describe('island helpers', () => {
  it('looks at the game from one island and writes it back', () => {
    const game = createInitialState(1)
    const view = toIslandState(game, 0)
    expect(view.map).toBe(game.islands[0].map)
    expect(view.coins).toBe(game.coins)
    const back = fromIslandState(game, { ...view, coins: 5, stock: { wood: 1 } })
    expect(back.coins).toBe(5)
    expect(back.islands[0].stock).toEqual({ wood: 1 })
    expect(back.islands[1]).toBe(game.islands[1])
  })

  it('applies a rule to one island and keeps the game if nothing changes', () => {
    const game = createInitialState(1)
    expect(onIsland(game, 2, (island) => island)).toBe(game)
    const next = onIsland(game, 2, (island) => ({ ...island, stock: { food: 3 } }))
    expect(getIsland(next, 2).stock).toEqual({ food: 3 })
    expect(getIsland(next, 0)).toBe(getIsland(game, 0))
  })

  it('applies a rule to every island and passes money from one to the next', () => {
    const game = createInitialState(1)
    const next = onEachIsland(game, (island) => ({ ...island, coins: island.coins + 1 }))
    expect(next.coins).toBe(game.coins + game.islands.length)
  })

  it('wraps a single island into a game and back', () => {
    const game = createInitialState(1)
    const lifted = liftIsland(toIslandState(game, 1))
    expect(lifted.islands).toHaveLength(1)
    expect(lifted.islands[0].id).toBe(1)
    expect(toIslandState(lifted, 1).map).toBe(game.islands[1].map)
  })

  it('throws for an unknown island', () => {
    expect(() => getIsland(createInitialState(1), 99)).toThrow()
  })
})
