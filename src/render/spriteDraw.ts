import { getBuilding } from '../data'
import type { PlacedBuilding } from '../sim/state'
import { buildingRect } from '../sim/coverage'
import { tileToWorld, HALF_H, HALF_W } from './iso'
import { PICTURE_SCALE, sprites, type SpriteImage } from './sprites'
import { buildingKey } from './spriteKeys'
import { built, type Rendered } from './built'
import { hash2 } from '../world/noise2d'

/** World pixels per picture pixel of a building picture. */
export const SPRITE_SCALE = PICTURE_SCALE

export interface SpritePlacement {
  image: SpriteImage
  /** Top left corner and size in world pixels. */
  x: number
  y: number
  width: number
  height: number
  mirrored: boolean
  /** Height of the building above the ground in world pixels. */
  rise: number
  /** Set for a picture made by code: its shadow, its lit windows, its chimney. */
  made?: Rendered
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
  const def = getBuilding(building.type)
  const [w0, h0] = def.size
  // a picture made by code is built the way the building stands; a painted one is mirrored for the other way
  const made = built(key, building.rotated && w0 !== h0) ?? undefined
  const image = made?.image ?? sprites.get(key)
  if (!image) return null
  const rect = buildingRect(building)
  const top = tileToWorld(rect.x, rect.y)
  const pads = made?.pads ?? sprites.pads(key)
  const width = image.width * SPRITE_SCALE
  const height = image.height * SPRITE_SCALE
  const mirrored = !made && building.rotated && w0 !== h0
  // The footprint box lies inside the picture: `pads` is what the picture has beyond it.
  const rise = height - (pads.t + pads.b) * SPRITE_SCALE - (w0 + h0) * HALF_H
  const padLeft = (mirrored ? pads.r : pads.l) * SPRITE_SCALE
  const [dx, dy] = building.house ? houseShift(building.x, building.y) : [0, 0]
  return { image, x: top.x - rect.h * HALF_W - padLeft + dx, y: top.y - rise - pads.t * SPRITE_SCALE + dy, width, height, mirrored, rise, made }
}

/**
 * No row of houses stands in a ruled line: every dwelling is drawn up to two world pixels off the middle of its
 * plot, always the same way for the same plot. Only how it looks; the plot it stands on stays where it is. Pure.
 */
export function houseShift(x: number, y: number): [number, number] {
  return [(hash2(x, y, 661) - 0.5) * 4, (hash2(x, y, 662) - 0.5) * 2.4]
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
