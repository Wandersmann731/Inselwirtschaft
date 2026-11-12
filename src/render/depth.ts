// Who stands in front of whom on the map. Buildings are drawn back to front; carts and residents move between them
// and must be slotted into that order, or a cart in front of a house would be painted over by the house.

import type { TileRect } from './shapes'

/** Something small that moves on the map. `x`, `y` is where it stands, in tiles (the middle of a tile is at .5). */
export interface Mover {
  x: number
  y: number
  draw(ctx: CanvasRenderingContext2D): void
}

/** A building's picture can cover what stands this many tiles behind it (towers and high roofs). */
const REACH = 6

/** True if the point stands behind the building: not beyond its front right nor its front left side. */
export function isBehind(x: number, y: number, rect: TileRect): boolean {
  return x < rect.x + rect.w && y < rect.y + rect.h
}

/**
 * Where a mover goes in the drawing order of the buildings (`rects`, back to front): before the first building it
 * stands behind and close to, so that building covers it and all buildings behind it do not. After all of them
 * (rects.length) if it stands in front of everything near it. Pure.
 */
export function moverSlot(mover: { x: number; y: number }, rects: readonly (TileRect | null)[]): number {
  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i]
    if (!rect || !isBehind(mover.x, mover.y, rect)) continue
    if (mover.x > rect.x - REACH && mover.y > rect.y - REACH) return i
  }
  return rects.length
}
