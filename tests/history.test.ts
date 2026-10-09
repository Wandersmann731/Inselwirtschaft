import { describe, expect, it } from 'vitest'
import { config } from '../src/data'
import { HISTORY_LENGTH, recordCycles, snapshotOf } from '../src/game/history'
import { describeSave } from '../src/save/saveGame'
import { patchHouse } from './helpers'
import { placeBuilding } from '../src/sim/build'
import { createInitialState } from '../src/sim/state'
import { grassField } from './helpers'
import { liftIsland } from '../src/sim/islands'

const cycle = config.economyCycleTicks

describe('recordCycles', () => {
  const base = createInitialState(1)
  const at = (tick: number) => ({ ...base, tick })

  it('adds a line only when an economy cycle ended between two states', () => {
    expect(recordCycles([], at(5), at(6), cycle)).toEqual([])
    const added = recordCycles([], at(cycle - 1), at(cycle), cycle)
    expect(added).toHaveLength(1)
    expect(added[0].cycle).toBe(1)
    expect(added[0].tick).toBe(cycle)
  })

  it('keeps only the last lines', () => {
    let history: ReturnType<typeof recordCycles> = []
    for (let i = 1; i <= HISTORY_LENGTH + 10; i++) history = recordCycles(history, at(i * cycle - 1), at(i * cycle), cycle)
    expect(history).toHaveLength(HISTORY_LENGTH)
    expect(history[history.length - 1].cycle).toBe(HISTORY_LENGTH + 10)
  })

  it('reads coins, balance and residents of the realm', () => {
    let island = grassField(30, 30, { coins: 1234.9, stock: { tools: 99, wood: 99 } })
    island = placeBuilding(island, 'house_pioneers', 5, 5, false)
    island = patchHouse(island, 1, { residents: 8 })
    const game = liftIsland({
      ...island,
      economy: { current: island.economy.current, last: { income: 50, upkeep: 20, produced: {}, consumed: {} } },
    })
    const snapshot = snapshotOf({ ...game, tick: 3 * cycle }, cycle)
    expect(snapshot).toMatchObject({ cycle: 3, coins: 1134, balance: 30, income: 50, residents: 8 })
  })
})

describe('describeSave', () => {
  it('summarises a game for the load menu', () => {
    const info = describeSave({ ...createInitialState(4), tick: 600, coins: 777.8 })
    expect(info).toMatchObject({ tick: 600, coins: 777, residents: 0, seed: 4 })
    expect(info.savedAt).toBeGreaterThan(1_700_000_000_000)
  })
})
