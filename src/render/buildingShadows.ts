// Soft shadows: every building throws a short shadow to the right, away from the light in the top left. They are
// drawn on the ground before any building, so they fall on grass, sand and roads but never on another house.
import { buildingRect } from '../sim/coverage'
import type { IslandState } from '../sim/state'
import type { TileRange } from './buildingRenderer'
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
