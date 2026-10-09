import { getBuilding } from '../data'
import type { PlacedBuilding } from '../sim/state'
import { buildingRect } from '../sim/coverage'
import { tileToWorld, HALF_H, HALF_W } from './iso'
import { sprites } from './sprites'
import { buildingKey } from './spriteKeys'

/** Sprites are made at twice the game's tile size. */
const SPRITE_SCALE = 0.5

export interface SpritePlacement {
  image: HTMLImageElement
  /** Top left corner and size in world pixels. */
  x: number
  y: number
  width: number
  height: number
  mirrored: boolean
  /** Height of the building above the ground in world pixels. */
  rise: number
}

/**
 * Where the sprite of a building goes. The picture was drawn for the size in the building data; a rotated building
 * is the mirrored picture. The ground area lies at the bottom of the picture, its top corner sits on the top corner
 * of the building's tile area.
 */
export function placeSprite(
  building: Pick<PlacedBuilding, 'type' | 'x' | 'y' | 'rotated' | 'house'>,
  key: string = buildingKey(building),
): SpritePlacement | null {
  const image = sprites.get(key)
  if (!image) return null
  const def = getBuilding(building.type)
  const rect = buildingRect(building)
  const top = tileToWorld(rect.x, rect.y)
  const pads = sprites.pads(key)
  const width = image.width * SPRITE_SCALE
  const height = image.height * SPRITE_SCALE
  const [w0, h0] = def.size
  const mirrored = building.rotated && w0 !== h0
  // The footprint box lies inside the picture: `pads` is what the picture has beyond it.
  const rise = height - (pads.t + pads.b) * SPRITE_SCALE - (w0 + h0) * HALF_H
  const padLeft = (mirrored ? pads.r : pads.l) * SPRITE_SCALE
  return { image, x: top.x - rect.h * HALF_W - padLeft, y: top.y - rise - pads.t * SPRITE_SCALE, width, height, mirrored, rise }
}

export function drawPlacedSprite(ctx: CanvasRenderingContext2D, placed: SpritePlacement, alpha = 1): void {
  const { image, x, y, width, height, mirrored } = placed
  const previous = ctx.globalAlpha
  ctx.globalAlpha = previous * alpha
  if (mirrored) {
    ctx.save()
    ctx.translate(x + width, y)
    ctx.scale(-1, 1)
    ctx.drawImage(image, 0, 0, width, height)
    ctx.restore()
  } else {
    ctx.drawImage(image, x, y, width, height)
  }
  ctx.globalAlpha = previous
}
