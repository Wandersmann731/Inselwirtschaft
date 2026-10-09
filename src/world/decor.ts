import { fbm, hash2 } from './noise2d'
import { Terrain } from './terrain'
import { mountainDepth } from './elevation'
import type { GameMap } from './terrain'

export type DecorKind =
  | 'tree' | 'pine' | 'palm' | 'bush' | 'rock' | 'tuft' | 'flowers' | 'pebbles'
  | 'peak_small' | 'peak_medium' | 'peak_large' | 'peak_snow'

/** How many picture variants each kind has (decor/<kind>_<n>). */
export const DECOR_VARIANTS: Record<DecorKind, number> = {
  tree: 4, pine: 3, palm: 2, bush: 3, rock: 3, tuft: 3, flowers: 2, pebbles: 2,
  peak_small: 3, peak_medium: 3, peak_large: 3, peak_snow: 2,
}

/** Tall objects stand in front of nearby buildings and are drawn together with them. Low ones stay in the ground picture. */
const TALL: ReadonlySet<DecorKind> = new Set(['tree', 'pine', 'palm', 'bush', 'rock', 'peak_small', 'peak_medium', 'peak_large', 'peak_snow'])

export function isTall(kind: DecorKind): boolean {
  return TALL.has(kind)
}

export interface DecorItem {
  kind: DecorKind
  /** 1-based picture variant. */
  variant: number
  /** Where the base of the object stands, in tile coordinates (fractions inside the tile). */
  x: number
  y: number
  scale: number
  flip: boolean
}

export interface DecorContext {
  map: GameMap
  seed: number
  climate: string
  /** True for tiles that carry a building or road: nothing grows there. */
  blocked: (x: number, y: number) => boolean
}

const COLD = new Set(['polar', 'tundra', 'north'])
const WARM = new Set(['steppe', 'jungle'])

function make(ctx: DecorContext, salt: number, tx: number, ty: number, kind: DecorKind, jitter: number, scaleMin: number, scaleMax: number): DecorItem {
  const r = (n: number): number => hash2(tx * 31 + n, ty * 17 + salt, ctx.seed + n * 7)
  return {
    kind,
    variant: 1 + Math.floor(r(1) * DECOR_VARIANTS[kind]),
    x: tx + 0.5 + (r(2) - 0.5) * jitter,
    y: ty + 0.5 + (r(3) - 0.5) * jitter,
    scale: scaleMin + r(4) * (scaleMax - scaleMin),
    flip: r(5) < 0.5,
  }
}

/**
 * The objects that stand on one tile: trees on forest, tufts and flowers on grass, peaks on mountains and so on.
 * Nothing depends on neighbouring chunks or on the order of drawing, so the same tile always gives the same result.
 * Density follows slowly changing noise, so the land forms groves, clearings and mountain ranges, not a pattern.
 */
export function decorForTile(ctx: DecorContext, tx: number, ty: number): DecorItem[] {
  const { map, seed } = ctx
  if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return []
  if (ctx.blocked(tx, ty)) return []
  const terrain = map.tiles[ty * map.width + tx]
  const chance = (salt: number): number => hash2(tx, ty, seed * 13 + salt)
  const items: DecorItem[] = []

  if (terrain === Terrain.Forest) {
    const density = fbm(tx * 0.16, ty * 0.16, seed + 3, 3) // groves and clearings
    const coniferShare = fbm(tx * 0.1 + 40, ty * 0.1 + 40, seed + 5, 2) + (COLD.has(ctx.climate) ? 0.22 : -0.12)
    const count = density < 0.28 ? (chance(1) < 0.65 ? 1 : 0) : density < 0.45 ? 2 + (chance(2) < 0.4 ? 1 : 0) : 4 + (chance(2) < 0.5 ? 1 : 0)
    for (let i = 0; i < count; i++) {
      const pine = hash2(tx * 7 + i, ty * 5, seed + 9) < Math.max(0.05, Math.min(0.95, coniferShare))
      items.push(make(ctx, 10 + i, tx, ty, pine ? 'pine' : 'tree', 0.95, 0.62, 1.38))
    }
    if (chance(3) < 0.18) items.push(make(ctx, 20, tx, ty, 'bush', 0.9, 0.7, 1))
    if (chance(4) < 0.2) items.push(make(ctx, 21, tx, ty, 'tuft', 0.9, 0.8, 1.1))
  } else if (terrain === Terrain.Grass) {
    const meadow = fbm(tx * 0.2 + 7, ty * 0.2 + 7, seed + 11, 2)
    if (chance(5) < 0.55) items.push(make(ctx, 30, tx, ty, 'tuft', 0.9, 0.8, 1.15))
    if (chance(6) < 0.3) items.push(make(ctx, 31, tx, ty, 'tuft', 0.9, 0.7, 1))
    if (meadow > 0.58 && chance(7) < 0.4) items.push(make(ctx, 32, tx, ty, 'flowers', 0.8, 0.8, 1.1))
    if (chance(8) < 0.035) items.push(make(ctx, 33, tx, ty, 'bush', 0.8, 0.8, 1.1))
    if (chance(9) < 0.02) items.push(make(ctx, 34, tx, ty, 'rock', 0.8, 0.8, 1.1))
    if (chance(10) < 0.025) items.push(make(ctx, 35, tx, ty, COLD.has(ctx.climate) ? 'pine' : 'tree', 0.8, 0.85, 1.1))
  } else if (terrain === Terrain.Beach) {
    if (chance(11) < 0.07) items.push(make(ctx, 40, tx, ty, 'pebbles', 0.8, 0.8, 1.1))
    if (WARM.has(ctx.climate) && chance(12) < 0.09) items.push(make(ctx, 41, tx, ty, 'palm', 0.8, 0.85, 1.15))
    if (chance(13) < 0.05) items.push(make(ctx, 42, tx, ty, 'tuft', 0.8, 0.7, 0.95))
  } else if (terrain === Terrain.Mountain) {
    const depth = mountainDepth(map)[ty * map.width + tx]
    const ridge = fbm(tx * 0.13 + 90, ty * 0.13 + 90, seed + 15, 3) // ridges inside the mountain
    const height = depth + (ridge - 0.5) * 5
    if (height >= 5.5) {
      if (chance(14) < 0.2) {
        const snow = height >= 8.5 && chance(15) < 0.5
        items.push(make(ctx, 50, tx, ty, snow ? 'peak_snow' : 'peak_large', 0.9, 0.85 + Math.min(0.35, (height - 5.5) * 0.06), 1.15 + Math.min(0.4, (height - 5.5) * 0.06)))
      }
      if (chance(16) < 0.14) items.push(make(ctx, 51, tx, ty, 'peak_small', 1, 0.6, 0.95))
    } else if (height >= 3) {
      if (chance(17) < 0.24) items.push(make(ctx, 52, tx, ty, 'peak_medium', 0.9, 0.8, 1.2))
      if (chance(18) < 0.14) items.push(make(ctx, 53, tx, ty, 'peak_small', 1, 0.7, 1))
    } else if (height >= 1.2) {
      if (chance(19) < 0.26) items.push(make(ctx, 54, tx, ty, 'peak_small', 0.9, 0.7, 1.1))
      if (chance(20) < 0.25) items.push(make(ctx, 55, tx, ty, 'rock', 0.9, 0.8, 1.2))
    } else if (chance(21) < 0.4) {
      items.push(make(ctx, 56, tx, ty, 'rock', 0.9, 0.8, 1.3))
    }
  }
  return items
}
