// Carts on the roads: every delivery that is on its way in the simulation is shown as a small cart that rolls along
// the road between the producer and the trading post or market house. Purely for the eye, nothing is simulated here.

import { getBuilding } from '../data'
import { getSettings } from '../save/settings'
import { buildingRect } from '../sim/coverage'
import { getLinks } from '../sim/logistics'
import type { IslandState } from '../sim/state'
import { adjacentRoadTiles, roadDistances } from '../world/pathfinding'
import type { TileRange } from './buildingRenderer'
import { tileToWorld } from './iso'
import { drawCartBody, drawOx, drawPerson, FIGURE_SCALE } from './figures'
import { sprites } from './sprites'

/** No more than this many carts are drawn at once. */
const MAX_CARTS = 60

const cache = new WeakMap<number[], { occupancy: number[]; hubs: string; paths: Map<number, number[]> }>()

/**
 * The road every connected producer delivers on: tile indices from the road tile at the producer to the road tile at
 * the nearest running trading post or market house. It is as long as the delivery takes (see getLinks), so a cart
 * can follow it. Producers without a road, out of reach or without need of a road have no path.
 */
export function deliveryPaths(state: IslandState): Map<number, number[]> {
  const hubs = state.buildings.filter((building) => getBuilding(building.type).catchment !== undefined && building.active)
  const signature = hubs.map((hub) => hub.id).join(',')
  const hit = cache.get(state.roads)
  if (hit && hit.occupancy === state.occupancy && hit.hubs === signature) return hit.paths

  const { width, height } = state.map
  const fields = hubs.map((hub) => roadDistances(state.roads, width, height, adjacentRoadTiles(state.roads, width, height, buildingRect(hub))))
  const links = getLinks(state)
  const paths = new Map<number, number[]>()
  for (const building of state.buildings) {
    const link = links.get(building.id)
    if (link?.kind !== 'ok' || link.delay <= 0) continue
    // the hub in reach with the shortest road, as the link chose it: the one whose distance matches the delay
    const own = adjacentRoadTiles(state.roads, width, height, buildingRect(building))
    let best: { field: Int32Array; index: number; d: number } | null = null
    for (const field of fields) {
      for (const index of own) {
        const d = field[index]
        if (d >= 0 && (!best || d < best.d)) best = { field, index, d }
      }
    }
    if (!best) continue
    const path = [best.index]
    let index = best.index
    for (let d = best.d; d > 0; d--) {
      const x = index % width
      const next = [index - 1, index + 1, index - width, index + width].find(
        (n) => n >= 0 && n < best!.field.length && Math.abs((n % width) - x) <= 1 && best!.field[n] === d - 1,
      )
      if (next === undefined) break
      path.push(next)
      index = next
    }
    paths.set(building.id, path)
  }
  cache.set(state.roads, { occupancy: state.occupancy, hubs: signature, paths })
  return paths
}

/** Where a delivery is on its road, 0 at its start and 1 at its end. `ticks` may be fractional. */
export function shipmentShare(arrive: number, delay: number, ticks: number): number {
  return Math.max(0, Math.min(1, 1 - (arrive - ticks) / delay))
}

const HANDS: { shirt: string; top: string }[] = [
  { shirt: '#7a8f4e', top: '#5a4326' },
  { shirt: '#8a5f3c', top: '#c9a66b' },
  { shirt: '#5d7fa3', top: '#3b2717' },
]
const COATS = ['#8a5a36', '#c8b08a', '#5e4630']

/**
 * Draws the carts of the island. Farms, mines and other producers of raw goods send an ox cart; a workshop's goods,
 * and the materials brought to it, come on a hand cart that somebody pushes.
 */
export class Carts {
  /** `ticks` is the game time with its fraction (see TickClock), so the carts roll instead of jumping from tile to tile. */
  draw(ctx: CanvasRenderingContext2D, state: IslandState, range: TileRange, ticks: number): void {
    // carts belong to the town like the smoke: only the game's own setting hides them, not the system's wish for calm windows
    if (!state.owned || getSettings().reducedMotion) return
    const paths = deliveryPaths(state)
    const links = getLinks(state)
    const { width } = state.map
    let drawn = 0
    for (const building of state.buildings) {
      const shipments = building.production?.shipments
      const path = paths.get(building.id)
      const link = links.get(building.id)
      if (!shipments || shipments.length === 0 || !path || path.length < 2 || link?.kind !== 'ok') continue
      const raw = (getBuilding(building.type).inputs ?? []).length === 0
      for (const shipment of shipments) {
        const share = shipmentShare(shipment.arrive, link.delay, ticks)
        // goods leave the producer along the path, materials come the other way
        const out = shipment.kind === 'out'
        const along = (out ? share : 1 - share) * (path.length - 1)
        const from = path[Math.floor(along)]
        const to = path[Math.min(path.length - 1, Math.floor(along) + 1)]
        const part = along - Math.floor(along)
        const fx = from % width
        const fy = Math.floor(from / width)
        const dx = (to % width) - fx
        const dy = Math.floor(to / width) - fy
        const x = fx + dx * part
        const y = fy + dy * part
        if (x < range.minI - 1 || x > range.maxI + 1 || y < range.minJ - 1 || y > range.maxJ + 1) continue
        const at = tileToWorld(x + 0.5, y + 0.5)
        // direction on screen: one tile along x goes right and down, one along y left and down
        const sign = out ? 1 : -1
        const sx = (dx - dy) * sign
        const sy = ((dx + dy) / 2) * sign
        const length = Math.hypot(sx, sy) || 1
        drawTeam(ctx, at.x, at.y, sx / length, sy / length, shipment.good, raw && out, building.id, ticks)
        if (++drawn >= MAX_CARTS) return
      }
    }
  }
}

/** A cart with who moves it: an ox in front, or a person pushing from behind. (ux, uy) is the direction on screen. */
function drawTeam(ctx: CanvasRenderingContext2D, x: number, y: number, ux: number, uy: number, good: string, ox: boolean, id: number, ticks: number): void {
  const facing = ux >= 0 ? 1 : -1
  const stride = ticks * 7 + id
  const load = sprites.get(`icons/goods/${good}`)
  const cart = (): void => drawCartBody(ctx, x, y, load, ox)
  const mover = ox
    ? (): void => {
        const ax = x + ux * 14 * FIGURE_SCALE
        const ay = y + uy * 14 * FIGURE_SCALE
        // the shaft from the cart to the ox
        ctx.strokeStyle = '#3b2717'
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.moveTo(x + ux * 6 * FIGURE_SCALE, y + (uy * 6 - 5) * FIGURE_SCALE)
        ctx.lineTo(ax - ux * 4 * FIGURE_SCALE, ay - (uy * 4 + 5) * FIGURE_SCALE)
        ctx.stroke()
        drawOx(ctx, ax, ay, facing, stride, COATS[id % COATS.length])
      }
    : (): void => drawPerson(ctx, x - ux * 9.5 * FIGURE_SCALE, y - uy * 9.5 * FIGURE_SCALE, facing, stride, { ...HANDS[id % HANDS.length], pushing: true })
  // what stands lower on the screen is nearer and drawn last: the ox walks in front, the pusher behind
  const moverInFront = ox ? uy > 0 : uy < 0
  if (moverInFront) {
    cart()
    mover()
  } else {
    mover()
    cart()
  }
}
