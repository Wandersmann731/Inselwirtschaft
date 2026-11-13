// Reflections on the water: what stands at the water or floats on it shows below itself, upside down, darker and
// broken up by the waves. They are drawn on the sea before the land, so the ground covers whatever would fall on it:
// of a house a little back from the shore only the roof reaches the water. Every picture is worked out once.
import { buildingRect } from '../sim/coverage'
import type { IslandState, PlacedBuilding } from '../sim/state'
import { hash2 } from '../world/noise2d'
import { Terrain } from '../world/terrain'
import type { TileRange } from './buildingRenderer'
import { tileToWorld } from './iso'
import { quarterBlocks } from './quarterRenderer'
import { placedShips } from './shipRenderer'
import { placeSprite } from './spriteDraw'
import { buildingKey } from './spriteKeys'
import type { SpriteImage } from './sprites'
import { SHIP_ORIGIN } from './vessel/ship'

/** A reflection is this much lower than what it shows (seen from above, the water foreshortens it). */
const SQUASH = 0.72
/** How strongly it shows, and the dark water colour it is tinted with. */
const ALPHA = 0.5
const TINT = 'rgba(14, 44, 62, 0.5)'
/** The waves cut it into strips of this many world pixels and push them sideways by up to this many, more further out. */
const STRIP = 2
const PUSH = 3.2
/** The share of strips that a wave crest wipes out. */
const GAPS = 0.2
/** Water within this many tiles in front of a building makes it reflect. */
const NEAR = 3
/** Where the water line of a ship lies in its picture, from the top: a little below its middle, where the near side meets the water. */
const WATER_LINE = SHIP_ORIGIN.y + 0.05

const pictures = new Map<string, HTMLCanvasElement | null>()
const MAX_PICTURES = 60

/**
 * The reflection of a picture drawn `width` by `height` world pixels: flipped, tinted like the water, cut into
 * strips that are pushed sideways and fade out with the distance from the object. One picture pixel per world pixel.
 */
function reflectionOf(id: string, image: SpriteImage, width: number, height: number, mirrored: boolean): HTMLCanvasElement | null {
  const hit = pictures.get(id)
  if (hit !== undefined) return hit
  const w = Math.ceil(width + 2 * PUSH)
  const h = Math.ceil(height * SQUASH)
  const flipped = document.createElement('canvas')
  flipped.width = w
  flipped.height = h
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const f = flipped.getContext('2d')
  const g = canvas.getContext('2d')
  if (!f || !g) {
    pictures.set(id, null)
    return null
  }
  f.save()
  f.translate(mirrored ? w - PUSH : PUSH, h)
  f.scale(mirrored ? -1 : 1, -1)
  f.drawImage(image, 0, 0, width, h)
  f.restore()
  f.globalCompositeOperation = 'source-atop'
  f.fillStyle = TINT
  f.fillRect(0, 0, w, h)
  const seed = id.length * 31 + w
  for (let y = 0; y < h; y += STRIP) {
    const far = y / h
    // a crest wipes the strip out; more of them further from the object
    if (hash2(y, 3, seed) < GAPS * (0.4 + far)) continue
    const push = (hash2(y, 7, seed) - 0.5) * 2 * PUSH * (0.25 + 0.75 * far)
    g.globalAlpha = (1 - far * far) * (0.75 + 0.25 * hash2(y, 11, seed))
    g.drawImage(flipped, 0, y, w, STRIP, push, y, w, STRIP)
  }
  if (pictures.size >= MAX_PICTURES) pictures.clear()
  pictures.set(id, canvas)
  return canvas
}

const nearWater = new WeakMap<number[], PlacedBuilding[]>()

/** The buildings with open water close in front of them (down the screen). Looked up again when something is built. */
function reflecting(state: IslandState): PlacedBuilding[] {
  const hit = nearWater.get(state.occupancy)
  if (hit) return hit
  const { width, height, tiles } = state.map
  const open = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < width && y < height && tiles[y * width + x] === Terrain.Water && state.occupancy[y * width + x] === 0
  const list = state.buildings.filter((building) => {
    const rect = buildingRect(building)
    for (let y = rect.y; y < rect.y + rect.h + NEAR; y++) {
      for (let x = rect.x; x < rect.x + rect.w + NEAR; x++) {
        // only what lies in front: beyond the right or the left front edge
        if ((x >= rect.x + rect.w || y >= rect.y + rect.h) && open(x, y)) return true
      }
    }
    return false
  })
  nearWater.set(state.occupancy, list)
  return list
}

/** Draws the reflections of the ships and of the buildings at the water. `now` lets them sway a little. */
export function drawReflections(ctx: CanvasRenderingContext2D, state: IslandState, range: TileRange, now: number, animated: boolean): void {
  const sway = animated ? Math.sin(now / 900) * 0.7 : 0
  ctx.save()
  ctx.globalAlpha = ALPHA
  const blocks = quarterBlocks(state)
  for (const building of reflecting(state)) {
    const rect = buildingRect(building)
    if (rect.x > range.maxI + 6 || rect.x + rect.w < range.minI - 6 || rect.y > range.maxJ + 6 || rect.y + rect.h < range.minJ - 6) continue
    const block = building.quarter !== undefined ? (blocks.get(building.quarter) ?? null) : null
    const key = buildingKey(building, block)
    const placed = placeSprite(building, key)
    if (!placed) continue
    const picture = reflectionOf(`${key}|${placed.mirrored ? 'm' : ''}|${placed.width}`, placed.image, placed.width, placed.height, placed.mirrored)
    if (!picture) continue
    // mirrored at the front corner of the footprint: there the building meets the ground nearest to the viewer
    const front = tileToWorld(rect.x + rect.w, rect.y + rect.h)
    ctx.drawImage(picture, placed.x - PUSH + sway, front.y - (placed.y + placed.height - front.y) * SQUASH)
  }
  for (const ship of placedShips(state, now)) {
    const picture = reflectionOf(`${ship.key}|${ship.mirrored ? 'm' : ''}`, ship.image, ship.width, ship.height, ship.mirrored)
    if (!picture) continue
    const line = ship.top + ship.height * WATER_LINE
    ctx.drawImage(picture, ship.left - PUSH + sway, line - ship.height * (1 - WATER_LINE) * SQUASH)
  }
  ctx.restore()
}
