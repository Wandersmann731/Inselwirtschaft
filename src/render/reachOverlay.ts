import { getBuilding } from '../data'
import type { BuildingDef } from '../data'
import { buildingRect, tilesInRadius } from '../sim/coverage'
import type { IslandState } from '../sim/state'
import { Terrain } from '../world/terrain'
import type { TileRange } from './buildingRenderer'
import { HALF_H, HALF_W, tileToWorld } from './iso'

const GRID = 'rgba(255, 255, 255, 0.16)'
const HUB_REACH = 'rgba(130, 205, 255, 0.17)'

/** Adds one tile diamond to the current path (several can be filled or stroked in one go). */
export function addDiamond(ctx: CanvasRenderingContext2D, topX: number, topY: number, grow = 0): void {
  ctx.moveTo(topX, topY - grow)
  ctx.lineTo(topX + HALF_W + grow, topY + HALF_H)
  ctx.lineTo(topX, topY + 2 * HALF_H + grow)
  ctx.lineTo(topX - HALF_W - grow, topY + HALF_H)
  ctx.closePath()
}

/** How far a building reaches: the radius of public buildings, or the catchment of a Kontor and market house. */
export function reachOf(def: BuildingDef): number | undefined {
  return def.radius ?? def.catchment
}

/** A faint grid over the land tiles in view, shown while something is being built. */
export function drawGrid(ctx: CanvasRenderingContext2D, state: IslandState, range: TileRange): void {
  const { width, tiles } = state.map
  ctx.beginPath()
  for (let y = range.minJ; y <= range.maxJ; y++) {
    for (let x = range.minI; x <= range.maxI; x++) {
      const terrain = tiles[y * width + x]
      if (terrain === Terrain.Water || terrain === Terrain.Mountain) continue
      const top = tileToWorld(x, y)
      // each tile adds its four edges; shared edges are drawn twice, which does not show
      addDiamond(ctx, top.x, top.y)
    }
  }
  ctx.strokeStyle = GRID
  ctx.lineWidth = 1
  ctx.stroke()
}

const hubCache = new WeakMap<number[], { tiles: { x: number; y: number }[] }>()

/** The tiles that a Kontor or market house supplies. Residents and producers need to stand inside. */
export function hubReachTiles(state: IslandState): { x: number; y: number }[] {
  const hit = hubCache.get(state.occupancy)
  if (hit) return hit.tiles
  const seen = new Set<number>()
  const tiles: { x: number; y: number }[] = []
  for (const building of state.buildings) {
    const catchment = getBuilding(building.type).catchment
    if (catchment === undefined) continue
    for (const tile of tilesInRadius(buildingRect(building), catchment, state.map.width, state.map.height)) {
      const index = tile.y * state.map.width + tile.x
      if (state.map.tiles[index] === Terrain.Water || seen.has(index)) continue
      seen.add(index)
      tiles.push(tile)
    }
  }
  hubCache.set(state.occupancy, { tiles })
  return tiles
}

/** Marks the land that a Kontor or market house supplies. */
export function drawHubReach(ctx: CanvasRenderingContext2D, state: IslandState): void {
  const tiles = hubReachTiles(state)
  if (tiles.length === 0) return
  ctx.fillStyle = HUB_REACH
  ctx.beginPath()
  for (const tile of tiles) {
    const top = tileToWorld(tile.x, tile.y)
    addDiamond(ctx, top.x, top.y, 0.5)
  }
  ctx.fill()
}
