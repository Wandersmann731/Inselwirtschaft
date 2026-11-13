import { getBuilding } from '../data'
import type { PlacedBuilding } from '../sim/state'
import { hash2 } from '../world/noise2d'
import { builtVariants } from './built'
import { sprites } from './sprites'

/** All pictures of a building: those made by code, else the painted ones. */
function variantsOf(base: string): string[] {
  const made = builtVariants(base)
  return made.length > 0 ? made : sprites.variants(base)
}

/** Which of several pictures a building uses. Follows from where it stands, so it never changes. */
export function pickVariant(count: number, x: number, y: number): number {
  return Math.floor(hash2(x, y, 4242) * count)
}

/**
 * Sprite of a placed building. Houses show the picture of their current tier (or the ruin), and buildings that exist
 * in several pictures use one of them by position. Falls back to the plain name, then to nothing (colour shape).
 * A house in a block of a quarter (`block`: top left tile of the block) uses the picture without its own plot, so it
 * stands on the shared yard, and no two houses of the block get the same picture.
 */
export function buildingKey(building: Pick<PlacedBuilding, 'type' | 'x' | 'y' | 'house' | 'quarter'>, block: { x: number; y: number } | null = null): string {
  const def = getBuilding(building.type)
  const house = building.house
  const tier = house?.tier ?? def.houseTier
  const base = tier ? (house?.ruin ? 'buildings/house_ruin' : `buildings/house_${tier}`) : `buildings/${building.type}`
  if (block && tier && building.quarter !== undefined) {
    const cut = sprites.variants(`${base}_q`)
    const slot = Math.floor((building.x - block.x) / 2) + 3 * Math.floor((building.y - block.y) / 2)
    if (cut.length > 0) return cut[blockVariant(cut.length, building.quarter, slot)]
  }
  const list = variantsOf(base)
  if (list.length === 0) return base
  return list[pickVariant(list.length, building.x, building.y)]
}

/** Picture of the house on place `slot` of a block: the pictures in an order shuffled for each block, so all differ. */
export function blockVariant(count: number, quarter: number, slot: number): number {
  const order = Array.from({ length: count }, (_, i) => i)
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(hash2(quarter, i, 4243) * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order[slot % count]
}

/** The picture shown in the placement ghost: always the first one, so it does not flicker while you move it. */
export function ghostKey(typeId: string): string {
  const def = getBuilding(typeId)
  const base = def.houseTier ? `buildings/house_${def.houseTier}` : `buildings/${typeId}`
  return variantsOf(base)[0] ?? base
}
