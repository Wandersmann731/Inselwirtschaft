import { world } from '../data'
import { portCell } from '../world/seaPath'
import { Terrain } from '../world/terrain'
import type { GameState, IslandState } from './state'

/** Where the harbour of an island lies, in tiles of the island map (it may be just outside the map). */
export function portTile(game: Pick<GameState, 'world'>, islandId: number): { x: number; y: number } | null {
  const placement = game.world.placements.find((entry) => entry.id === islandId)
  const port = portCell(game.world, islandId)
  if (!placement || !port) return null
  return chartToTile(placement, port.x + 0.5, port.y + 0.5)
}

/** Converts a world chart position (in cells) to tiles of an island map. */
export function chartToTile(placement: { x: number; y: number }, cx: number, cy: number): { x: number; y: number } {
  const { cellTiles } = world.sea
  return { x: (cx - placement.x) * cellTiles, y: (cy - placement.y) * cellTiles }
}

/**
 * The water tile where a docked ship lies: open water next to the Kontor, or the harbour cell if the island has none.
 * Open water means a tile whose neighbours are water too, so the ship does not sit on the beach.
 */
export function dockTile(island: IslandState): { x: number; y: number } | null {
  const kontor = island.buildings.find((building) => building.type === 'kontor')
  if (!kontor) return portTile(island, island.id)
  const { width, height, tiles } = island.map
  const water = (x: number, y: number): boolean => x < 0 || y < 0 || x >= width || y >= height || tiles[y * width + x] === Terrain.Water
  const cx = kontor.x + 1
  const cy = kontor.y + 1
  let best: { x: number; y: number; d: number } | null = null
  for (let y = cy - 8; y <= cy + 8; y++) {
    for (let x = cx - 8; x <= cx + 8; x++) {
      if (!water(x, y) || !water(x + 1, y) || !water(x - 1, y) || !water(x, y + 1) || !water(x, y - 1)) continue
      const d = Math.hypot(x - cx, y - cy)
      if (d >= 3 && (!best || d < best.d)) best = { x, y, d }
    }
  }
  return best ? { x: best.x + 0.5, y: best.y + 0.5 } : portTile(island, island.id)
}
