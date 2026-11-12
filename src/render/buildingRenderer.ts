import { getBuilding } from '../data'
import { buildingRect } from '../sim/coverage'
import type { IslandState, HouseState, ProductionStatusKind } from '../sim/state'
import { cumulativeNeeds, getTier, tierIndex } from '../sim/tiers'
import { config } from '../data'
import { diamondPath } from './terrainStyle'
import { boxHeight, drawBox, type TileRect } from './shapes'
import { HALF_H, HALF_W, tileToWorld } from './iso'
import { drawDecor } from './decorDraw'
import { frontDecorIn, type FrontItem } from './frontDecor'
import { sprites } from './sprites'
import { drawPlacedSprite, placeSprite, SPRITE_SCALE, type SpritePlacement } from './spriteDraw'
import { buildingKey, roadKey, smokeKey } from './spriteKeys'
import { quarterBlocks } from './quarterRenderer'
import { coastEdges, fadedCopy, type FadeEdges } from './coastFade'

export interface TileRange {
  minI: number
  maxI: number
  minJ: number
  maxJ: number
}

const ROAD_COLOR = getBuilding('road').color
const SPRITE_GROW = 0.7

export function drawRoads(ctx: CanvasRenderingContext2D, state: IslandState, range: TileRange): void {
  const { width, height } = state.map
  const isRoad = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < width && y < height && state.roads[y * width + x] === 1
  ctx.fillStyle = ROAD_COLOR
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)'
  ctx.lineWidth = 1
  for (let y = range.minJ; y <= range.maxJ; y++) {
    for (let x = range.minI; x <= range.maxI; x++) {
      if (!state.roads[y * width + x]) continue
      const top = tileToWorld(x, y)
      const image = sprites.get(roadKey(isRoad(x, y - 1), isRoad(x + 1, y), isRoad(x, y + 1), isRoad(x - 1, y)))
      if (image) {
        ctx.drawImage(image, top.x - HALF_W - SPRITE_GROW, top.y - SPRITE_GROW / 2, 2 * HALF_W + 2 * SPRITE_GROW, 2 * HALF_H + SPRITE_GROW)
      } else {
        diamondPath(ctx, top.x, top.y, 0.5)
        ctx.fill()
        ctx.stroke()
      }
    }
  }
}

/**
 * Draws all buildings that overlap the visible tile range, back to front, together with the trees, bushes and rocks
 * right next to them (so these can stand in front of a building). `now` drives the smoke animation.
 */
export function drawBuildings(ctx: CanvasRenderingContext2D, state: IslandState, range: TileRange, now = 0, showSmoke = true): void {
  type Entry = { depth: number; building?: (typeof state.buildings)[number]; rect?: TileRect; decor?: FrontItem }
  const entries: Entry[] = []
  for (const building of state.buildings) {
    const rect = buildingRect(building)
    if (rect.x > range.maxI + 4 || rect.x + rect.w < range.minI - 4 || rect.y > range.maxJ + 4 || rect.y + rect.h < range.minJ - 4) continue
    entries.push({ depth: rect.x + rect.w / 2 + rect.y + rect.h / 2, building, rect })
  }
  for (const decor of frontDecorIn(state, range)) entries.push({ depth: decor.depth, decor })
  entries.sort((a, b) => a.depth - b.depth)
  const blocks = quarterBlocks(state)

  for (const entry of entries) {
    if (entry.decor) {
      drawDecor(ctx, entry.decor.item, entry.decor.wx, entry.decor.wy)
      continue
    }
    const { building, rect } = entry
    if (!building || !rect) continue
    const def = getBuilding(building.type)
    const house = building.house
    const block = building.quarter !== undefined ? (blocks.get(building.quarter) ?? null) : null
    const key = buildingKey(building, block)
    const placed = placeSprite(building, key)
    let dotHeight: number
    if (placed) {
      // a plot on the shore fades into the sand at its front edges. Not a house of a block (it stands on the shared
      // yard) and not the harbour buildings, whose wooden piers end where they end.
      if (!block && !(def.placement === 'coast' && def.category === 'infrastructure')) {
        const edges = frontCoast(state, building.id, rect)
        const top = tileToWorld(rect.x, rect.y)
        const frame = { originX: (top.x - placed.x) / SPRITE_SCALE, originY: (top.y - placed.y) / SPRITE_SCALE, scale: 1 / SPRITE_SCALE, w: rect.w, h: rect.h, mirrored: placed.mirrored }
        if (edges.se || edges.sw) placed.image = fadedCopy(key, placed.image, frame, edges)
      }
      drawPlacedSprite(ctx, placed)
      dotHeight = placed.rise * 0.8
      if (showSmoke && def.smoke && building.production?.status.kind === 'producing') drawSmoke(ctx, placed, def.smoke, now)
    } else {
      dotHeight = house ? houseHeight(house) : boxHeight(rect, def.category)
      drawBox(ctx, rect, dotHeight, house ? houseColor(house) : def.color)
    }
    if (!state.owned) continue // the towns of others show no status
    // a mark only where something is wrong: a producer that does not run, a house whose residents are leaving.
    // A town that works shows no marks at all.
    const mark = building.production ? STATUS_COLORS[building.production.status.kind] : house && !house.ruin && house.residents > 0 ? houseDotColor(house) : null
    if (!mark || mark === STATUS_COLORS.producing || (house && mark === STATUS_COLORS.waiting)) continue
    // what is missing shows as its picture: the good a workshop waits for, the good a house has run short of
    const missing = building.production ? (building.production.status.kind === 'waiting' ? building.production.status.good : undefined) : house ? shortGood(house) : undefined
    const icon = missing ? sprites.get(`icons/goods/${missing}`) : undefined
    if (icon) drawNeedBadge(ctx, rect, dotHeight, mark, icon)
    else drawStatusDot(ctx, rect, dotHeight, mark)
  }
}

let coastCache: { occupancy: number[]; edges: Map<number, FadeEdges> } | null = null

/** The front edges of a building that border the shore. Looked up once per building until something is built or torn down. */
function frontCoast(state: IslandState, id: number, rect: TileRect): FadeEdges {
  if (coastCache?.occupancy !== state.occupancy) coastCache = { occupancy: state.occupancy, edges: new Map() }
  let edges = coastCache.edges.get(id)
  if (!edges) {
    edges = { ...coastEdges(state.map, state.occupancy, rect), ne: false, nw: false }
    coastCache.edges.set(id, edges)
  }
  return edges
}

/** The good a house is short of (below the shortage line), if it is a good and not a public building. */
export function shortGood(house: HouseState): string | undefined {
  for (const need of cumulativeNeeds(house.tier)) {
    if (!need.good || need.optional || need.forRise) continue
    if ((house.needs[need.id] ?? 100) < config.population.shortageBelow) return need.good
  }
  return undefined
}

/** A round badge with the picture of the missing good, ringed in the colour of the problem. */
function drawNeedBadge(ctx: CanvasRenderingContext2D, rect: TileRect, height: number, color: string, icon: CanvasImageSource): void {
  const center = tileToWorld(rect.x + rect.w / 2, rect.y + rect.h / 2)
  const y = center.y - height - 4
  ctx.fillStyle = '#f6ecd6'
  ctx.strokeStyle = color
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(center.x, y, 10, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = 'rgba(40, 24, 8, 0.7)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(center.x, y, 11.5, 0, Math.PI * 2)
  ctx.stroke()
  ctx.drawImage(icon, center.x - 8, y - 8, 16, 16)
}

/** A column of smoke that rises from the chimney, looping. `chimney` is the opening as a share of the building picture. */
function drawSmoke(ctx: CanvasRenderingContext2D, placed: SpritePlacement, chimney: [number, number], now: number): void {
  const image = sprites.get(smokeKey(Math.floor(now / 100)))
  if (!image) return
  const width = image.width / 2
  const height = image.height / 2
  const fromLeft = placed.mirrored ? 1 - chimney[0] : chimney[0]
  const x = placed.x + fromLeft * placed.width
  const y = placed.y + chimney[1] * placed.height
  // The first puff of the smoke picture starts about 34 px above its bottom edge, in the middle.
  ctx.drawImage(image, x - width / 2, y - height + 34, width, height)
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
/**
 * Red: a need for staying is short, residents leave. Yellow: something is still missing to rise (a need below
 * 100 %, or the chapel the pioneers only need for rising). Green: all there. Optional bonus needs never colour it.
 */
function houseDotColor(house: HouseState): string {
  const kinds = new Map(cumulativeNeeds(house.tier).map((need) => [need.id, need]))
  const needs = Object.entries(house.needs).filter(([id]) => !kinds.get(id)?.optional)
  const toStay = needs.filter(([id]) => !kinds.get(id)?.forRise)
  if (toStay.some(([, percent]) => percent < config.population.shortageBelow)) return STATUS_COLORS.noRoad
  if (needs.some(([, percent]) => percent < 100 - 1e-6)) return STATUS_COLORS.waiting
  return STATUS_COLORS.producing
}
