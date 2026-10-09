import { getBuilding } from '../data'
import { buildingRect } from '../sim/coverage'
import type { IslandState, HouseState, ProductionStatusKind } from '../sim/state'
import { getTier, tierIndex } from '../sim/tiers'
import { config } from '../data'
import { diamondPath } from './terrainStyle'
import { boxHeight, drawBox, type TileRect } from './shapes'
import { tileToWorld } from './iso'

export interface TileRange {
  minI: number
  maxI: number
  minJ: number
  maxJ: number
}

const ROAD_COLOR = getBuilding('road').color

export function drawRoads(ctx: CanvasRenderingContext2D, state: IslandState, range: TileRange): void {
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
export function drawBuildings(ctx: CanvasRenderingContext2D, state: IslandState, range: TileRange): void {
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
    const house = building.house
    const height = house ? houseHeight(house) : boxHeight(rect, def.category)
    drawBox(ctx, rect, height, house ? houseColor(house) : def.color)
    if (building.production) drawStatusDot(ctx, rect, height, STATUS_COLORS[building.production.status.kind])
    else if (house && !house.ruin && house.residents > 0) drawStatusDot(ctx, rect, height, houseDotColor(house))
  }
}

/** Status colours of producers: green runs, yellow waits for goods, orange is full, red is cut off. */
export const STATUS_COLORS: Record<ProductionStatusKind, string> = {
  producing: '#4cd964',
  waiting: '#ffd23f',
  outputFull: '#ff9f43',
  noRoad: '#ff4d4d',
  noHub: '#ff4d4d',
  inactive: '#9aa0a6',
}

function drawStatusDot(ctx: CanvasRenderingContext2D, rect: TileRect, height: number, color: string): void {
  const center = tileToWorld(rect.x + rect.w / 2, rect.y + rect.h / 2)
  ctx.fillStyle = color
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(center.x, center.y - height, 6, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
}

const RUIN_COLOR = '#4d4a47'

function houseColor(house: HouseState): string {
  return house.ruin ? RUIN_COLOR : getTier(house.tier).color
}

/** Houses grow taller with their tier. Ruins are low. */
function houseHeight(house: HouseState): number {
  return house.ruin ? 8 : 20 + tierIndex(house.tier) * 6
}

/** Green if all needs are met, red if one is in shortage, yellow in between. */
function houseDotColor(house: HouseState): string {
  const values = Object.values(house.needs)
  if (values.some((percent) => percent < config.population.shortageBelow)) return STATUS_COLORS.noRoad
  if (values.some((percent) => percent < 100 - 1e-6)) return STATUS_COLORS.waiting
  return STATUS_COLORS.producing
}
