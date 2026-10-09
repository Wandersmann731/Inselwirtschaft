import { describe, expect, it } from 'vitest'
import { createRng } from '../src/sim/rng'
import { createInitialState } from '../src/sim/state'
import { setSpeed, tick } from '../src/sim/tick'

describe('tick', () => {
  it('increases the tick counter by one without mutating the input', () => {
    const before = createInitialState(1)
    const after = tick(before, createRng(before.rngState))
    expect(after.tick).toBe(1)
    expect(before.tick).toBe(0)
    expect(after).not.toBe(before)
  })

  it('is deterministic for the same state and rng', () => {
    const state = createInitialState(1)
    const a = tick(state, createRng(state.rngState))
    const b = tick(state, createRng(state.rngState))
    expect(a).toEqual(b)
  })

  it('stores the rng state so a reload continues the same sequence', () => {
    const rng = createRng(11)
    rng.next()
    const after = tick(createInitialState(11), rng)
    expect(after.rngState).toBe(rng.getState())
  })
})

describe('setSpeed', () => {
  it('accepts the configured speeds', () => {
    const state = createInitialState(1)
    for (const speed of [0, 1, 2, 4]) {
      expect(setSpeed(state, speed).speed).toBe(speed)
    }
  })

  it('ignores unknown speeds', () => {
    const state = createInitialState(1)
    expect(setSpeed(state, 3)).toBe(state)
  })
})
