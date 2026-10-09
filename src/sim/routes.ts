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

export function removeStop(state: GameState, routeId: number, stopIndex: number): GameState {
  return updateRoute(state, routeId, (route) => ({ ...route, stops: route.stops.filter((_, i) => i !== stopIndex) }))
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
