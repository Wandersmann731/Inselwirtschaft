import { describe, expect, it } from 'vitest'
import { trade } from '../src/data'
import { addOrder, addStop, createRoute, createTransportRoute, deleteRoute, removeOrder, removeStop } from '../src/sim/routes'
import { createInitialState, type Ship } from '../src/sim/state'

const ship = (routeId: number | null): Ship => ({
  id: 1,
  name: 'Schiff',
  capacity: 60,
  cargo: {},
  island: 0,
  x: 0,
  y: 0,
  path: [],
  destination: null,
  routeId,
  stopIndex: 0,
})

describe('routes', () => {
  const base = createInitialState(1)

  it('lays out a whole transport route in one go: load at one island, unload everything at the other', () => {
    const state = createTransportRoute(base, 3, 0, 'tobacco', 25)
    expect(state.routes).toHaveLength(1)
    expect(state.routes[0].stops).toEqual([
      { island: 3, orders: [{ good: 'tobacco', amount: 25, mode: 'load' }] },
      { island: 0, orders: [{ good: 'tobacco', amount: trade.orderAmounts[trade.orderAmounts.length - 1], mode: 'unload' }] },
    ])
    expect(state.nextRouteId).toBe(base.nextRouteId + 1)
  })

  it('refuses a transport route between the same island, to an unknown island or without an amount', () => {
    expect(createTransportRoute(base, 0, 0, 'tobacco', 25)).toBe(base)
    expect(createTransportRoute(base, 0, 999, 'tobacco', 25)).toBe(base)
    expect(createTransportRoute(base, 0, 3, 'tobacco', 0)).toBe(base)
  })

  it('creates routes with running numbers and a default name', () => {
    let state = createRoute(base)
    state = createRoute(state, 'Seide holen')
    expect(state.routes.map((r) => [r.id, r.name])).toEqual([
      [1, 'Route 1'],
      [2, 'Seide holen'],
    ])
    expect(state.nextRouteId).toBe(3)
  })

  it('adds and removes stops and orders', () => {
    let state = createRoute(base)
    state = addStop(state, 1, 0)
    state = addStop(state, 1, 3)
    state = addOrder(state, 1, 0, { good: 'wood', amount: 20, mode: 'load' })
    state = addOrder(state, 1, 1, { good: 'wood', amount: 20, mode: 'unload' })
    state = addOrder(state, 1, 1, { good: 'tools', amount: 5, mode: 'unload' })
    expect(state.routes[0].stops.map((stop) => stop.island)).toEqual([0, 3])
    expect(state.routes[0].stops[1].orders).toHaveLength(2)
    state = removeOrder(state, 1, 1, 0)
    expect(state.routes[0].stops[1].orders).toEqual([{ good: 'tools', amount: 5, mode: 'unload' }])
    state = removeStop(state, 1, 0)
    expect(state.routes[0].stops.map((stop) => stop.island)).toEqual([3])
  })

  it('ignores unknown routes, unknown islands and empty orders', () => {
    const state = createRoute(base)
    expect(addStop(state, 9, 0)).toBe(state)
    expect(addStop(state, 1, 99)).toBe(state)
    expect(addOrder(addStop(state, 1, 0), 1, 0, { good: 'wood', amount: 0, mode: 'load' }).routes[0].stops[0].orders).toEqual([])
  })

  it('keeps a ship heading for the same stop when an earlier stop is removed', () => {
    let state = createRoute(base)
    state = addStop(state, 1, 0)
    state = addStop(state, 1, 2)
    state = addStop(state, 1, 3)
    state = { ...state, ships: [{ ...ship(1), stopIndex: 2 }, { ...ship(1), id: 2, stopIndex: 0 }] }
    const next = removeStop(state, 1, 0)
    // the first ship was heading for island 3, which is now stop 1; the second for the removed stop, now the next one
    expect(next.routes[0].stops[next.ships[0].stopIndex].island).toBe(3)
    expect(next.routes[0].stops[next.ships[1].stopIndex].island).toBe(2)
    expect(removeStop(state, 1, 7)).toBe(state)
  })

  it('takes ships off a deleted route', () => {
    let state = { ...createRoute(base), ships: [ship(1)] }
    state = deleteRoute(state, 1)
    expect(state.routes).toEqual([])
    expect(state.ships[0].routeId).toBeNull()
  })
})
