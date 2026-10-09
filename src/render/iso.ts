import { world } from '../data'
import type { GameMap } from '../world/terrain'

export interface Point {
  x: number
  y: number
}

export interface Bounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export const HALF_W = world.tileWidth / 2
export const HALF_H = world.tileHeight / 2

/** World position of a tile's top corner. Tile (tx, ty) is the diamond below and around it. */
export function tileToWorld(tx: number, ty: number): Point {
  return { x: (tx - ty) * HALF_W, y: (tx + ty) * HALF_H }
}

/** Inverse of tileToWorld. The result is fractional: floor() gives the tile under the point. */
export function worldToTile(wx: number, wy: number): Point {
  const a = wx / HALF_W
  const b = wy / HALF_H
  return { x: (a + b) / 2, y: (b - a) / 2 }
}

/** World-space rectangle that contains the whole map diamond. */
export function mapBounds(map: Pick<GameMap, 'width' | 'height'>): Bounds {
  return {
    minX: -map.height * HALF_W,
    maxX: map.width * HALF_W,
    minY: 0,
    maxY: (map.width + map.height) * HALF_H,
  }
}
