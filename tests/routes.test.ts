import { describe, expect, it } from 'vitest'
import { addOrder, addStop, createRoute, deleteRoute, removeOrder, removeStop } from '../src/sim/routes'
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

  it('takes ships off a deleted route', () => {
    let state = { ...createRoute(base), ships: [ship(1)] }
    state = deleteRoute(state, 1)
    expect(state.routes).toEqual([])
    expect(state.ships[0].routeId).toBeNull()
  })
})
