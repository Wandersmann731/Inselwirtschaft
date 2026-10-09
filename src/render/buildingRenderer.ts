import { getBuilding } from '../data'
import { buildingRect } from '../sim/coverage'
import type { GameState } from '../sim/state'
import { diamondPath } from './terrainStyle'
import { boxHeight, drawBox } from './shapes'
import { tileToWorld } from './iso'

export interface TileRange {
  minI: number
  maxI: number
  minJ: number
  maxJ: number
}

const ROAD_COLOR = getBuilding('road').color

export function drawRoads(ctx: CanvasRenderingContext2D, state: GameState, range: TileRange): void {
  const { width } = state.map
  ctx.fillStyle = ROAD_COLOR
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)'
  ctx.lineWidth = 1
  for (let y = range.minJ; y <= range.maxJ; y++) {
    for (let x = range.minI; x <= range.maxI; x++) {
      if (!state.roads[y * width + x]) continue
      const top = tileToWorld(x, y)
      diamondPath(ctx, top.x, top.y, 0.5)
      ctx.fill()
      ctx.stroke()
    }
  }
}

/** Draws all buildings that overlap the visible tile range, back to front. */
export function drawBuildings(ctx: CanvasRenderingContext2D, state: GameState, range: TileRange): void {
  const visible = state.buildings
    .map((building) => ({ building, rect: buildingRect(building) }))
    .filter(
      ({ rect }) =>
        rect.x <= range.maxI + 4 &&
        rect.x + rect.w >= range.minI - 4 &&
        rect.y <= range.maxJ + 4 &&
        rect.y + rect.h >= range.minJ - 4,
    )
    .sort((a, b) => a.rect.x + a.rect.w + a.rect.y + a.rect.h - (b.rect.x + b.rect.w + b.rect.y + b.rect.h))
  for (const { building, rect } of visible) {
    const def = getBuilding(building.type)
    drawBox(ctx, rect, boxHeight(rect, def.category), def.color)
  }
}
