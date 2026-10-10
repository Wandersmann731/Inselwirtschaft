// Plays every producer on its own on a real home island and looks for buildings that get stuck.
import { describe, expect, it } from 'vitest'
import { buildings, config, getBuilding, goods } from '../src/data'
import { placeBuilding, placeRoads } from '../src/sim/build'
import { nearestSpot, originAt } from '../src/game/placeSearch'
import { toIslandState } from '../src/sim/islands'
import { createNewGame } from '../src/sim/newGame'
import { planRoute } from '../src/sim/roadPlanner'
import { createRng } from '../src/sim/rng'
import type { IslandState } from '../src/sim/state'
import { stockCapacity } from '../src/sim/storage'
import { tickFlat } from './helpers'

const producers = buildings.filter((def) => def.output && !def.hidden)

/** The home island of a new game, with every fertility and deposit, rich, all tiers open, and one producer of the type connected to the Kontor. */
function withProducer(typeId: string, stock: Record<string, number>): { state: IslandState; id: number } {
  const game = createNewGame(7, 1_000_000)
  const home = game.islands.find((island) => island.owned)!
  let state: IslandState = {
    ...toIslandState(game, home.id),
    highestTier: 4,
    fertilities: [...new Set(buildings.flatMap((def) => (def.requiresFertility ? [def.requiresFertility] : [])))],
    deposits: [...new Set(buildings.flatMap((def) => (def.requiresDeposit ? [def.requiresDeposit] : [])))],
    stock: { ...Object.fromEntries(goods.map((good) => [good.id, 0])), tools: 500, wood: 500, bricks: 500, marble: 100 },
  }
  const kontor = state.buildings.find((b) => b.type === 'kontor')!
  const spot = nearestSpot(state, typeId, false, { x: kontor.x + 1, y: kontor.y + 1 }, 80)
  if (!spot) throw new Error(`no spot for ${typeId}`)
  const origin = originAt(typeId, false, spot)
  state = placeBuilding(state, typeId, origin.x, origin.y, false)
  const id = state.nextBuildingId - 1
  if (!state.buildings.some((b) => b.id === id && b.type === typeId)) throw new Error(`could not place ${typeId}`)
  let hub = { x: kontor.x, y: kontor.y }
  if (Math.hypot(origin.x - kontor.x, origin.y - kontor.y) > 15) {
    // far from the Kontor (mines on the mountain): a market house next to it, as a player would build
    const marketSpot = nearestSpot(state, 'market_house', false, spot, 12)
    if (!marketSpot) throw new Error(`no market house spot near ${typeId}`)
    hub = originAt('market_house', false, marketSpot)
    state = placeBuilding(state, 'market_house', hub.x, hub.y, false)
  }
  const route = planRoute(state, origin, hub)
  if (route.reachable) state = placeRoads(state, route.newTiles)
  // the test is about production, not about the stock that the placing used
  return { state: { ...state, stock: { ...state.stock, tools: 500, wood: 500, bricks: 500, marble: 100, ...stock } }, id }
}

function run(state: IslandState, ticks: number, keep: Record<string, number> = {}): IslandState {
  let next = state
  for (let i = 0; i < ticks; i++) {
    next = tickFlat(next, createRng(next.rngState))
    // inputs stay available, as if other buildings kept delivering
    if (Object.keys(keep).length > 0) next = { ...next, stock: { ...next.stock, ...keep } }
  }
  return next
}

const inputsOf = (typeId: string): Record<string, number> =>
  Object.fromEntries((getBuilding(typeId).inputs ?? []).map((input) => [input.good, 50]))

describe('production audit: every producer on its own', () => {
  for (const def of producers) {
    describe(def.id, () => {
      it('gets connected and produces when its inputs are in the store', () => {
        const { state, id } = withProducer(def.id, { [def.output!.good]: 0 })
        const after = run(state, (def.cycleTicks ?? 1) * 6 + 120, inputsOf(def.id))
        const building = after.buildings.find((b) => b.id === id)!
        expect(building.production!.status.kind, `${def.id} status`).not.toMatch(/noRoad|noHub|waiting/)
        expect(after.stock[def.output!.good] ?? 0, `${def.id} delivered`).toBeGreaterThan(0)
      })

      it('never waits for a good that lies in the store', () => {
        const { state, id } = withProducer(def.id, {})
        let next = state
        let stuck = 0
        for (let i = 0; i < (def.cycleTicks ?? 1) * 8 + 200; i++) {
          next = run(next, 1, inputsOf(def.id))
          const status = next.buildings.find((b) => b.id === id)!.production!.status
          stuck = status.kind === 'waiting' && status.good && (next.stock[status.good] ?? 0) > 0 ? stuck + 1 : 0
          expect(stuck, `${def.id} waits for ${status.kind === 'waiting' ? status.good : ''} although it is in the store`).toBeLessThan(80)
        }
      })

      it('goes on when the store is full of its byproducts and starts again after a full store is emptied', () => {
        const output = def.output!.good
        const fullOfExtras = Object.fromEntries((def.byproducts ?? []).map((extra) => [extra.good, 10_000]))
        const { state, id } = withProducer(def.id, { [output]: 0 })
        const cap = stockCapacity(state)
        const extrasFull = run({ ...state, stock: { ...state.stock, ...fullOfExtras } }, (def.cycleTicks ?? 1) * 6 + 120, { ...inputsOf(def.id), ...Object.fromEntries(Object.keys(fullOfExtras).map((g) => [g, cap])) })
        expect(extrasFull.stock[output] ?? 0, `${def.id} with byproducts full`).toBeGreaterThan(0)

        const full = run({ ...state, stock: { ...state.stock, [output]: cap } }, (def.cycleTicks ?? 1) * 8 + 60, inputsOf(def.id))
        expect(full.buildings.find((b) => b.id === id)!.production!.status.kind, `${def.id} full store`).toBe('outputFull')
        const emptied = run({ ...full, stock: { ...full.stock, [output]: 0 } }, (def.cycleTicks ?? 1) * 3 + 60, inputsOf(def.id))
        expect(emptied.stock[output] ?? 0, `${def.id} after emptying`).toBeGreaterThan(0)
      })
    })
  }

  it('checks every producer', () => {
    expect(producers.length).toBeGreaterThan(30)
    expect(config.production.outputBufferAmount).toBeGreaterThanOrEqual(Math.max(...producers.map((def) => def.output!.amount)))
  })
})
