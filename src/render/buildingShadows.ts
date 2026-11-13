// Soft shadows: every building throws a short shadow to the right, away from the light in the top left. They are
// drawn on the ground before any building, so they fall on grass, sand and roads but never on another house.
import { getBuilding } from '../data'
import { buildingRect } from '../sim/coverage'
import type { IslandState } from '../sim/state'
import { isPier, type TileRange } from './buildingRenderer'
import { coastEdges } from './coastFade'
import type { TileRect } from './shapes'
import { tileToWorld } from './iso'
import { placeSprite } from './spriteDraw'

/** Share of the building's height the shadow reaches to the right, and how far at most (world pixels). */
const REACH = 0.3
const MAX_REACH = 22
const LAYERS = [
  { grow: 1, alpha: 0.2 },
  { grow: 0.6, alpha: 0.14 },
]

export function drawShadows(ctx: CanvasRenderingContext2D, state: IslandState, range: TileRange): void {
  ctx.save()
  for (const building of state.buildings) {
    const rect = buildingRect(building)
    if (rect.x > range.maxI + 4 || rect.x + rect.w < range.minI - 4 || rect.y > range.maxJ + 4 || rect.y + rect.h < range.minJ - 4) continue
    if (isPier(getBuilding(building.type))) drawPierWater(ctx, state, rect)
    const rise = placeSprite(building)?.rise ?? 24
    const reach = Math.min(MAX_REACH, rise * REACH)
    if (reach < 3) continue
    const top = tileToWorld(rect.x, rect.y)
    const right = tileToWorld(rect.x + rect.w, rect.y)
    const bottom = tileToWorld(rect.x + rect.w, rect.y + rect.h)
    const left = tileToWorld(rect.x, rect.y + rect.h)
    for (const layer of LAYERS) {
      const dx = reach * layer.grow
      const dy = dx * 0.35
      ctx.fillStyle = `rgba(18, 28, 22, ${layer.alpha})`
      ctx.beginPath()
      // the footprint swept along the direction of the shadow
      ctx.moveTo(top.x, top.y)
      ctx.lineTo(top.x + dx, top.y + dy)
      ctx.lineTo(right.x + dx, right.y + dy)
      ctx.lineTo(bottom.x + dx, bottom.y + dy)
      ctx.lineTo(left.x + dx * 0.4, left.y + dy + 2)
      ctx.lineTo(left.x, left.y)
      ctx.closePath()
      ctx.fill()
    }
  }
  ctx.restore()
}

/**
 * A pier meets the water: under its front edges on the shore lies a dark, wet shadow, and a soft line of foam
 * runs along it. Drawn before the pier itself, so only what looks out from under the planks shows.
 */
function drawPierWater(ctx: CanvasRenderingContext2D, state: IslandState, rect: TileRect): void {
  const edges = coastEdges(state.map, state.occupancy, rect)
  if (!edges.se && !edges.sw) return
  const right = tileToWorld(rect.x + rect.w, rect.y)
  const bottom = tileToWorld(rect.x + rect.w, rect.y + rect.h)
  const left = tileToWorld(rect.x, rect.y + rect.h)
  const line = (drop: number): void => {
    ctx.beginPath()
    if (edges.se) {
      ctx.moveTo(right.x, right.y + drop)
      ctx.lineTo(bottom.x, bottom.y + drop)
    }
    if (edges.sw) {
      ctx.moveTo(bottom.x, bottom.y + drop)
      ctx.lineTo(left.x, left.y + drop)
    }
    ctx.stroke()
  }
  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(8, 30, 52, 0.3)'
  ctx.lineWidth = 16
  line(6)
  ctx.strokeStyle = 'rgba(8, 30, 52, 0.28)'
  ctx.lineWidth = 9
  line(5)
  // foam where the water meets the pier: a soft band with a thin light edge, not a drawn line
  ctx.strokeStyle = 'rgba(226, 238, 240, 0.12)'
  ctx.lineWidth = 5
  line(13)
  ctx.strokeStyle = 'rgba(226, 238, 240, 0.3)'
  ctx.lineWidth = 1
  line(13)
}
