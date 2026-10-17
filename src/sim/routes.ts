import type { GameState, Route, RouteOrder } from './state'

function updateRoute(state: GameState, routeId: number, change: (route: Route) => Route): GameState {
  if (!state.routes.some((route) => route.id === routeId)) return state
  return { ...state, routes: state.routes.map((route) => (route.id === routeId ? change(route) : route)) }
}

export function createRoute(state: GameState, name?: string): GameState {
  const route: Route = { id: state.nextRouteId, name: name ?? `Route ${state.nextRouteId}`, stops: [] }
  return { ...state, routes: [...state.routes, route], nextRouteId: state.nextRouteId + 1 }
}

/** Deletes a route. Ships that followed it keep their cargo but go back to taking single orders. */
export function deleteRoute(state: GameState, routeId: number): GameState {
  return {
    ...state,
    routes: state.routes.filter((route) => route.id !== routeId),
    ships: state.ships.map((ship) => (ship.routeId === routeId ? { ...ship, routeId: null } : ship)),
  }
}

export function addStop(state: GameState, routeId: number, islandId: number): GameState {
  if (!state.islands.some((island) => island.id === islandId)) return state
  return updateRoute(state, routeId, (route) => ({ ...route, stops: [...route.stops, { island: islandId, orders: [] }] }))
}

/** Removes a stop. Ships on the route keep heading for the same stop, or for the one after a removed stop. */
export function removeStop(state: GameState, routeId: number, stopIndex: number): GameState {
  const route = state.routes.find((entry) => entry.id === routeId)
  if (!route || stopIndex < 0 || stopIndex >= route.stops.length) return state
  const left = route.stops.length - 1
  const shifted = (index: number): number => (left === 0 ? 0 : index > stopIndex ? index - 1 : index)
  return {
    ...updateRoute(state, routeId, (entry) => ({ ...entry, stops: entry.stops.filter((_, i) => i !== stopIndex) })),
    ships: state.ships.map((ship) => (ship.routeId === routeId ? { ...ship, stopIndex: shifted(ship.stopIndex) } : ship)),
  }
}

export function addOrder(state: GameState, routeId: number, stopIndex: number, order: RouteOrder): GameState {
  if (order.amount <= 0) return state
  return updateRoute(state, routeId, (route) => ({
    ...route,
    stops: route.stops.map((stop, i) => (i === stopIndex ? { ...stop, orders: [...stop.orders, order] } : stop)),
  }))
}

export function removeOrder(state: GameState, routeId: number, stopIndex: number, orderIndex: number): GameState {
  return updateRoute(state, routeId, (route) => ({
    ...route,
    stops: route.stops.map((stop, i) =>
      i === stopIndex ? { ...stop, orders: stop.orders.filter((_, j) => j !== orderIndex) } : stop,
    ),
  }))
}
