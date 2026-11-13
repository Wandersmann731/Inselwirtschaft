import { chartToTile, dockTile } from '../sim/harbour'
import type { IslandState, Ship } from '../sim/state'
import { tileToWorld } from './iso'
import type { SpriteImage } from './sprites'
import { HEADINGS, SHIP_ORIGIN, SHIP_SIZE, shipPicture } from './vessel/ship'

/** How far beyond the island map a sailing ship is still drawn, in tiles. */
const MARGIN = 16

const dockCache = new WeakMap<number[], { x: number; y: number } | null>()

/** Which of the eight pictures of the ship fits a heading on screen: 0 sails to the right, 2 down, 4 to the left. */
export function sectorFor(sx: number, sy: number): number {
  return ((Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) % HEADINGS) + HEADINGS) % HEADINGS
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

/** A ship as it is drawn: its picture and where it goes, in world pixels. */
export interface PlacedShip {
  key: string
  image: SpriteImage
  left: number
  top: number
  width: number
  height: number
  mirrored: boolean
}

/** The ships lying in the harbour or sailing past this island, gently rocking with `now`. */
export function placedShips(state: IslandState, now: number): PlacedShip[] {
  const list: PlacedShip[] = []
  for (const ship of state.ships) {
    const placed = placeShip(state, ship)
    if (!placed) continue
    const sector = sectorFor(placed.sx || -1, placed.sy || 0.5)
    const image = shipPicture(sector)
    if (!image) continue
    const at = tileToWorld(placed.x, placed.y)
    const bob = Math.sin(now / 700 + ship.id) * 1.5
    // the picture is built for its heading, sun on its left: it is never mirrored
    list.push({ key: `ships/ship_${sector}`, image, left: at.x - SHIP_SIZE * SHIP_ORIGIN.x, top: at.y - SHIP_SIZE * SHIP_ORIGIN.y + bob, width: SHIP_SIZE, height: SHIP_SIZE, mirrored: false })
  }
  return list
}

/** Draws the ships. Their reflections on the water are drawn before the land, see reflections.ts. */
export function drawShips(ctx: CanvasRenderingContext2D, state: IslandState, now: number): void {
  for (const { image, left, top, width, height, mirrored } of placedShips(state, now)) {
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
