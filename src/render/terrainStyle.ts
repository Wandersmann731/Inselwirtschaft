import { t } from '../i18n/language'
import { Terrain } from '../world/terrain'
import { HALF_H, HALF_W } from './iso'

/**
 * The flat colours of sea and land: for the small map, and for a tile whose ground picture is not made yet. They
 * are the mean colours of the real grounds, so a tile does not change colour when its picture arrives.
 */
export const SEA_COLOR = '#2a4d62'
/** The sea over the sand along a coast, on the small map. */
export const SHALLOW_COLOR = '#3f7f84'

export const TILE_COLORS: Record<number, string> = {
  [Terrain.Beach]: '#ceae75',
  [Terrain.Grass]: '#7f823f',
  [Terrain.Forest]: '#30562c',
  [Terrain.Mountain]: '#80786c',
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

/** Paints one land tile as a flat coloured diamond with its top corner at (topX, topY). Used while the real picture is not ready. */
export function paintTile(ctx: CanvasRenderingContext2D, terrain: number, topX: number, topY: number): void {
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

/** Name of a terrain code for the developer display. */
export function terrainName(terrain: number): string {
  switch (terrain) {
    case Terrain.Water:
      return t('Wasser', 'Water')
    case Terrain.Beach:
      return t('Strand', 'Beach')
    case Terrain.Grass:
      return t('Gras', 'Grass')
    case Terrain.Forest:
      return t('Wald', 'Forest')
    case Terrain.Mountain:
      return t('Berg', 'Mountain')
    default:
      return String(terrain)
  }
}
