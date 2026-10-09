import { chartToTile, dockTile } from '../sim/harbour'
import type { IslandState, Ship } from '../sim/state'
import { tileToWorld } from './iso'
import { sprites } from './sprites'

/** Ship pictures are made at twice the game's size, like buildings. */
const SPRITE_SCALE = 0.5
/** How far beyond the island map a sailing ship is still drawn, in tiles. */
const MARGIN = 16

const dockCache = new WeakMap<number[], { x: number; y: number } | null>()

/** Picture for a heading on screen: 8 directions, the western ones are the eastern ones mirrored. */
function pictureFor(sx: number, sy: number): { key: string; mirrored: boolean } {
  const sector = Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) // 0 = east, 2 = south (down), -2 = north (up)
  switch (sector) {
    case 0:
      return { key: 'ships/ship_iso_e', mirrored: false }
    case 1:
      return { key: 'ships/ship_iso_s', mirrored: false }
    case 2:
      return { key: 'ships/ship_iso_s', mirrored: false }
    case 3:
      return { key: 'ships/ship_iso_sw', mirrored: false }
    case -1:
      return { key: 'ships/ship_iso_n', mirrored: false }
    case -2:
      return { key: 'ships/ship_iso_n', mirrored: false }
    case -3:
      return { key: 'ships/ship_iso_nw', mirrored: false }
    default:
      return { key: 'ships/ship_iso_e', mirrored: true }
  }
}

/** Where a ship is on this island's map and where it heads (screen direction), or null if it is not near. */
function placeShip(state: IslandState, ship: Ship): { x: number; y: number; sx: number; sy: number } | null {
  if (ship.island === state.id) {
    if (!dockCache.has(state.occupancy)) dockCache.set(state.occupancy, dockTile(state))
    const dock = dockCache.get(state.occupancy)
    return dock ? { ...dock, sx: -1, sy: 0.5 } : null
  }
  if (ship.island !== null) return null
  const placement = state.world.placements.find((entry) => entry.id === state.id)
  if (!placement) return null
  const at = chartToTile(placement, ship.x + 0.5, ship.y + 0.5)
  const { width, height } = state.map
  if (at.x < -MARGIN || at.y < -MARGIN || at.x > width + MARGIN || at.y > height + MARGIN) return null
  const next = ship.path[0]
  const to = next ? chartToTile(placement, next.x + 0.5, next.y + 0.5) : at
  const dx = to.x - at.x
  const dy = to.y - at.y
  return { ...at, sx: dx - dy, sy: (dx + dy) / 2 }
}

/** Draws the ships lying in the harbour or sailing past this island, gently rocking. */
export function drawShips(ctx: CanvasRenderingContext2D, state: IslandState, now: number): void {
  for (const ship of state.ships) {
    const placed = placeShip(state, ship)
    if (!placed) continue
    const { key, mirrored } = pictureFor(placed.sx || -1, placed.sy || 0.5)
    const image = sprites.get(key)
    if (!image) continue
    const at = tileToWorld(placed.x, placed.y)
    const width = image.width * SPRITE_SCALE
    const height = image.height * SPRITE_SCALE
    const bob = Math.sin(now / 700 + ship.id) * 1.5
    const left = at.x - width / 2
    const top = at.y - height * 0.7 + bob
    if (mirrored) {
      ctx.save()
      ctx.translate(left + width, top)
      ctx.scale(-1, 1)
      ctx.drawImage(image, 0, 0, width, height)
      ctx.restore()
    } else {
      ctx.drawImage(image, left, top, width, height)
    }
  }
}
