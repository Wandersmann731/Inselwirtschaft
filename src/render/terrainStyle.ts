import { Terrain } from '../world/terrain'
import { HALF_H, HALF_W } from './iso'
import { sprites } from './sprites'
import { terrainKey } from './spriteKeys'

/** Placeholder colours until real sprites exist. */
export const SEA_COLOR = '#1d4e6b'

export const TILE_COLORS: Record<number, string> = {
  [Terrain.Beach]: '#e2d39a',
  [Terrain.Grass]: '#6aa84f',
  [Terrain.Forest]: '#38761d',
  [Terrain.Mountain]: '#8a8a8a',
}

/** Tiles are painted slightly larger so no hairline gaps show between them. */
const OVERLAP = 0.5

export function diamondPath(ctx: CanvasRenderingContext2D, topX: number, topY: number, grow = 0): void {
  ctx.beginPath()
  ctx.moveTo(topX, topY - grow)
  ctx.lineTo(topX + HALF_W + grow, topY + HALF_H)
  ctx.lineTo(topX, topY + 2 * HALF_H + grow)
  ctx.lineTo(topX - HALF_W - grow, topY + HALF_H)
  ctx.closePath()
}

/** Sprites are cut slightly inside the diamond, so they are drawn a little bigger to overlap their neighbours. */
const SPRITE_GROW = 0.7

/** Paints one land tile with its top corner at (topX, topY). Water is left to the background. */
export function paintTile(
  ctx: CanvasRenderingContext2D,
  terrain: number,
  topX: number,
  topY: number,
  tileX = 0,
  tileY = 0,
): void {
  const key = terrainKey(terrain, tileX, tileY)
  const image = key ? sprites.get(key) : undefined
  if (image) {
    ctx.drawImage(image, topX - HALF_W - SPRITE_GROW, topY - SPRITE_GROW / 2, 2 * HALF_W + 2 * SPRITE_GROW, 2 * HALF_H + SPRITE_GROW)
    return
  }
  const color = TILE_COLORS[terrain]
  if (!color) return
  diamondPath(ctx, topX, topY, OVERLAP)
  ctx.fillStyle = color
  ctx.fill()
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)'
  ctx.lineWidth = 1
  diamondPath(ctx, topX, topY)
  ctx.stroke()

  const cy = topY + HALF_H
  if (terrain === Terrain.Forest) {
    ctx.fillStyle = '#274e13'
    ctx.beginPath()
    ctx.arc(topX, cy, HALF_H * 0.5, 0, Math.PI * 2)
    ctx.fill()
  } else if (terrain === Terrain.Mountain) {
    ctx.fillStyle = '#5c5c5c'
    ctx.beginPath()
    ctx.moveTo(topX, cy - HALF_H * 0.6)
    ctx.lineTo(topX + HALF_W * 0.4, cy + HALF_H * 0.4)
    ctx.lineTo(topX - HALF_W * 0.4, cy + HALF_H * 0.4)
    ctx.closePath()
    ctx.fill()
  }
}
