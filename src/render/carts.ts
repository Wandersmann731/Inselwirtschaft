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

/** Draws the carts of the island. Keeps time between two ticks, so the carts roll instead of jumping from tile to tile. */
export class Carts {
  private tick = -1
  private tickAt = 0
  private tickLength = 1000

  draw(ctx: CanvasRenderingContext2D, state: IslandState, range: TileRange, now: number): void {
    if (state.tick !== this.tick) {
      // how long the last tick took tells how fast the game runs
      if (this.tick >= 0 && state.tick > this.tick) this.tickLength = Math.max(40, Math.min(1500, (now - this.tickAt) / (state.tick - this.tick)))
      this.tick = state.tick
      this.tickAt = now
    }
    // carts belong to the town like the smoke: only the game's own setting hides them, not the system's wish for calm windows
    if (!state.owned || getSettings().reducedMotion) return
    const ticks = state.tick + Math.min(1, (now - this.tickAt) / this.tickLength)
    const paths = deliveryPaths(state)
    const links = getLinks(state)
    const { width } = state.map
    let drawn = 0
    for (const building of state.buildings) {
      const shipments = building.production?.shipments
      const path = paths.get(building.id)
      const link = links.get(building.id)
      if (!shipments || shipments.length === 0 || !path || path.length < 2 || link?.kind !== 'ok') continue
      for (const shipment of shipments) {
        const share = shipmentShare(shipment.arrive, link.delay, ticks)
        // goods leave the producer along the path, materials come the other way
        const along = (shipment.kind === 'out' ? share : 1 - share) * (path.length - 1)
        const from = path[Math.floor(along)]
        const to = path[Math.min(path.length - 1, Math.floor(along) + 1)]
        const part = along - Math.floor(along)
        const x = (from % width) + ((to % width) - (from % width)) * part
        const y = Math.floor(from / width) + (Math.floor(to / width) - Math.floor(from / width)) * part
        if (x < range.minI - 1 || x > range.maxI + 1 || y < range.minJ - 1 || y > range.maxJ + 1) continue
        const at = tileToWorld(x + 0.5, y + 0.5)
        drawCart(ctx, at.x, at.y, shipment.good, (to % width) - (from % width) - (Math.floor(to / width) - Math.floor(from / width)) < 0)
        if (++drawn >= MAX_CARTS) return
      }
    }
  }
}

/** A small hand cart with its load on top. `leftward`: it rolls to the left on screen, so the shaft points there. */
function drawCart(ctx: CanvasRenderingContext2D, x: number, y: number, good: string, leftward: boolean): void {
  const dir = leftward ? -1 : 1
  // shadow on the road
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
  ctx.beginPath()
  ctx.ellipse(x, y + 1, 8, 3, 0, 0, Math.PI * 2)
  ctx.fill()
  // shaft, body and wheel
  ctx.strokeStyle = '#3b2717'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x + 5 * dir, y - 4)
  ctx.lineTo(x + 10 * dir, y - 2)
  ctx.stroke()
  ctx.fillStyle = '#9a6b3c'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.rect(x - 6, y - 7, 12, 5)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#3b2717'
  ctx.beginPath()
  ctx.arc(x - 1 * dir, y - 1, 2.6, 0, Math.PI * 2)
  ctx.fill()
  const icon = sprites.get(`icons/goods/${good}`)
  if (icon) ctx.drawImage(icon, x - 6, y - 18, 12, 12)
}
