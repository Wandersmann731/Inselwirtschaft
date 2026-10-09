import { world } from '../data'
import { anchorTiles, nearestRouteTile, passable, planRoute, segmentOf, type RoutePlan, type Tile } from '../sim/roadPlanner'
import type { IslandState } from '../sim/state'

/** What is being dragged: one of the end points or a waypoint. */
export type RouteGrab = { kind: 'start' } | { kind: 'end' } | { kind: 'via'; index: number }

/**
 * A road the player is planning: start and end are given, the game proposes the route, and waypoints
 * (dragged out of the route) bend it. Nothing is built until the player confirms.
 */
export interface RouteDraft {
  start: Tile | null
  end: Tile | null
  via: Tile[]
  plan: RoutePlan | null
  grab: RouteGrab | null
}

export const EMPTY_ROUTE: RouteDraft = { start: null, end: null, via: [], plan: null, grab: null }

const same = (a: Tile, b: Tile): boolean => a.x === b.x && a.y === b.y

function withPlan(state: IslandState, draft: RouteDraft): RouteDraft {
  if (!draft.start || !draft.end) return { ...draft, plan: null }
  return { ...draft, plan: planRoute(state, draft.start, draft.end, draft.via) }
}

/** A tap sets the start first, then the end. Later taps move the end; waypoints stay. */
export function tapRoute(state: IslandState, draft: RouteDraft, tile: Tile): RouteDraft {
  if (anchorTiles(state, tile).length === 0) return draft
  if (!draft.start) return { ...draft, start: tile }
  if (same(draft.start, tile)) return draft
  const next = withPlan(state, { ...draft, end: tile })
  return next.plan?.reachable ? next : draft
}

/** The player touched the map: picks up a handle or the route itself. Null if nothing is close. */
export function grabRoute(draft: RouteDraft, tile: Tile): RouteDraft | null {
  const { plan, start, end } = draft
  if (!plan || !start || !end) return null
  const radius = world.roadPlanner.grabRadius
  const near = (p: Tile): boolean => Math.hypot(p.x - tile.x, p.y - tile.y) <= radius
  if (near(end)) return { ...draft, grab: { kind: 'end' } }
  if (near(start)) return { ...draft, grab: { kind: 'start' } }
  const via = draft.via.findIndex(near)
  if (via >= 0) return { ...draft, grab: { kind: 'via', index: via } }
  const onRoute = nearestRouteTile(plan, tile, radius)
  if (!onRoute) return null
  // A new waypoint goes into the slot of the segment it was pulled from.
  const index = segmentOf(plan, onRoute)
  const waypoints = [...draft.via.slice(0, index), onRoute, ...draft.via.slice(index)]
  return { ...draft, via: waypoints, grab: { kind: 'via', index } }
}

/** Moves the grabbed handle to a tile. Spots with no way through are ignored. */
export function moveRoute(state: IslandState, draft: RouteDraft, tile: Tile): RouteDraft {
  const { grab } = draft
  if (!grab) return draft
  let moved: RouteDraft
  if (grab.kind === 'via') {
    if (!passable(state, tile.x, tile.y)) return draft
    moved = { ...draft, via: draft.via.map((v, i) => (i === grab.index ? tile : v)) }
  } else {
    if (anchorTiles(state, tile).length === 0) return draft
    moved = { ...draft, [grab.kind]: tile }
  }
  const next = withPlan(state, moved)
  return next.plan?.reachable ? next : draft
}

/** Lets go of the handle. */
export function releaseRoute(_state: IslandState, draft: RouteDraft): RouteDraft {
  if (!draft.grab) return draft
  return { ...draft, grab: null }
}

/** Removes all waypoints, so the game proposes the best route again. */
export function resetWaypoints(state: IslandState, draft: RouteDraft): RouteDraft {
  return withPlan(state, { ...draft, via: [], grab: null })
}
