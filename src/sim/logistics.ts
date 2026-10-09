import { config, getBuilding } from '../data'
import { adjacentRoadTiles, roadDistances } from '../world/pathfinding'
import { buildingRect, inRadius } from './coverage'
import type { IslandState } from './state'

/** How a producer is tied to the island store: not at all, or with a delivery time. */
export type Link = { kind: 'ok'; delay: number } | { kind: 'noRoad' } | { kind: 'noHub' }

/** One cached result per island, found by its road array. */
const cache = new WeakMap<number[], { occupancy: number[]; hubs: string; links: Map<number, Link> }>()

/** Which hubs are running: shutting one down changes the links without touching roads or buildings. */
function hubSignature(state: IslandState): string {
  return state.buildings
    .filter((building) => getBuilding(building.type).catchment !== undefined && building.active)
    .map((building) => building.id)
    .join(',')
}

/**
 * Link of every producing building. A producer delivers to a running market house or Kontor if it
 * lies in its catchment area (one tile inside is enough) and a road leads from the
 * producer to the hub. The delay is the road length times config.production.ticksPerRoadTile.
 * The result only changes when roads or buildings change, so it is cached on those.
 */
export function getLinks(state: IslandState): Map<number, Link> {
  const hubs = hubSignature(state)
  const hit = cache.get(state.roads)
  if (hit && hit.occupancy === state.occupancy && hit.hubs === hubs) return hit.links
  const links = computeLinks(state)
  cache.set(state.roads, { occupancy: state.occupancy, hubs, links })
  return links
}

function computeLinks(state: IslandState): Map<number, Link> {
  const { width, height } = state.map
  const hubs = state.buildings
    .map((building) => ({ building, def: getBuilding(building.type) }))
    .filter(({ building, def }) => def.catchment !== undefined && building.active)
    .map(({ building, def }) => {
      const rect = buildingRect(building)
      const sources = adjacentRoadTiles(state.roads, width, height, rect)
      return { rect, catchment: def.catchment ?? 0, dist: roadDistances(state.roads, width, height, sources) }
    })

  const links = new Map<number, Link>()
  for (const building of state.buildings) {
    const def = getBuilding(building.type)
    if (!def.output) continue
    const rect = buildingRect(building)

    const inRange = hubs.filter((hub) => rectInCatchment(rect, hub.rect, hub.catchment))
    if (inRange.length === 0) {
      links.set(building.id, { kind: 'noHub' })
      continue
    }
    if (def.needsRoad === false) {
      links.set(building.id, { kind: 'ok', delay: 0 })
      continue
    }
    const ownRoads = adjacentRoadTiles(state.roads, width, height, rect)
    let best = -1
    for (const hub of inRange) {
      for (const index of ownRoads) {
        const d = hub.dist[index]
        if (d >= 0 && (best === -1 || d < best)) best = d
      }
    }
    links.set(
      building.id,
      best === -1 ? { kind: 'noRoad' } : { kind: 'ok', delay: (best + 1) * config.production.ticksPerRoadTile },
    )
  }
  return links
}

function rectInCatchment(
  rect: { x: number; y: number; w: number; h: number },
  hub: { x: number; y: number; w: number; h: number },
  radius: number,
): boolean {
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      if (inRadius(x, y, hub, radius)) return true
    }
  }
  return false
}
