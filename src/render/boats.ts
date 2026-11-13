// A rowing boat lies moored at every pier. A building picture does not know on which side of it the water is, so the
// boat is no part of it: the map is asked where the sea touches the pier, and the boat is drawn there, rocking a
// little on the swell.
import { getBuilding } from '../data'
import { buildingRect } from '../sim/coverage'
import type { IslandState } from '../sim/state'
import { Terrain, type GameMap } from '../world/terrain'
import { tileToWorld } from './iso'
import type { TileRect } from './shapes'

/**
 * The tile beside a building where a boat can lie: sea, touching the building, and with the most sea around it (so
 * the boat lies on the open side, not in a corner of the beach). Null if no sea touches the building. Pure.
 */
export function berthOf(map: GameMap, rect: TileRect): { x: number; y: number } | null {
  const sea = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < map.width && y < map.height && map.tiles[y * map.width + x] === Terrain.Water
  let best: { x: number; y: number; open: number } | null = null
  for (let y = rect.y - 1; y <= rect.y + rect.h; y++) {
    for (let x = rect.x - 1; x <= rect.x + rect.w; x++) {
      const inside = x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h
      const corner = (x < rect.x || x >= rect.x + rect.w) && (y < rect.y || y >= rect.y + rect.h)
      if (inside || corner || !sea(x, y)) continue
      let open = 0
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (sea(x + dx, y + dy)) open++
      // of equally open places the one further to the front, where it is seen
      if (!best || open > best.open || (open === best.open && x + y > best.x + best.y)) best = { x, y, open }
    }
  }
  return best && { x: best.x, y: best.y }
}

const berths = new WeakMap<object, Map<number, { x: number; y: number } | null>>()

/** Draws the boats at the piers of an island. Before the buildings: a boat lies on the water under their jetties. */
export function drawBoats(ctx: CanvasRenderingContext2D, state: IslandState, now: number): void {
  let known = berths.get(state.buildings)
  if (!known) {
    known = new Map()
    berths.set(state.buildings, known)
  }
  for (const building of state.buildings) {
    if (getBuilding(building.type).pier !== true) continue
    let berth = known.get(building.id)
    if (berth === undefined) {
      berth = berthOf(state.map, buildingRect(building))
      known.set(building.id, berth)
    }
    if (!berth) continue
    const at = tileToWorld(berth.x + 0.5, berth.y + 0.5)
    const rock = Math.sin(now / 1100 + building.id)
    ctx.save()
    ctx.translate(at.x, at.y + rock * 0.5)
    ctx.rotate((building.id % 2 ? 0.46 : -0.46) + rock * 0.03)
    // its dark picture in the water, the hull, the inside in shade, the thwarts, an oar laid across
    ctx.fillStyle = 'rgba(12, 30, 48, 0.3)'
    ctx.beginPath()
    ctx.ellipse(0.6, 1.3, 7.4, 2.5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgb(128, 96, 64)'
    ctx.beginPath()
    ctx.moveTo(-7.6, 0)
    ctx.quadraticCurveTo(-4, -3, 4, -2.6)
    ctx.quadraticCurveTo(7.2, -1.6, 8.4, 0)
    ctx.quadraticCurveTo(7.2, 2.2, 4, 2.6)
    ctx.quadraticCurveTo(-4, 3, -7.6, 0)
    ctx.fill()
    ctx.fillStyle = 'rgb(72, 54, 40)'
    ctx.beginPath()
    ctx.ellipse(0.2, 0.3, 6.2, 1.7, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgb(168, 134, 92)'
    for (const x of [-2.6, 1.6]) ctx.fillRect(x, -1.3, 0.9, 3.2)
    ctx.fillStyle = 'rgba(255, 236, 200, 0.5)'
    ctx.fillRect(-6, -2.5, 11, 0.45)
    ctx.fillStyle = 'rgb(186, 156, 112)'
    ctx.fillRect(-5, 0.1, 9, 0.45)
    ctx.restore()
  }
}
