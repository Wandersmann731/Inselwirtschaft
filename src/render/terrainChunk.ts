import { decorForTile, isTall, type DecorItem } from '../world/decor'
import { surroundRing } from '../world/surroundings'
import { LIGHT } from './buildingShadows'
import { decorScale, decorSprite, drawDecor, drawDecorShadow } from './decorDraw'
import { noteTree, swaysHere } from './forestSway'
import type { GroundTextures } from '../world/ground'
import { hash2 } from '../world/noise2d'
import { GRAIN_SCALE, GRAIN_SPAN, groundGrain, paintGround } from './groundTextures'
import { world } from '../data'
import { Terrain, type GameMap } from '../world/terrain'
import { layFlags, pavedAt, type TownGround } from './townGround'

/** The terrain is drawn in rectangles of this size (world pixels). Each rectangle is its own picture. */
export const CHUNK_W = 512
export const CHUNK_H = 256

const HALF_W = 32
const HALF_H = 16
/** Objects reach beyond the rectangle: wide trees sideways, tall peaks upwards. */
const EXPAND_X = 150
const EXPAND_UP = 270
const EXPAND_DOWN = 24

export interface ChunkContext {
  map: GameMap
  seed: number
  climate: string
  occupancy: number[]
  roads: number[]
  /** Village yard strength per tile (see settlement.ts), or null while there are no houses. */
  yard: Float32Array | null
  /** The flags and gardens of the town (see townGround.ts), if there is one. */
  town?: TownGround | null
  textures: GroundTextures
}

/** Indices of the tiles whose objects can reach into the rectangle (rx, ry). */
export function chunkTiles(map: GameMap, rx: number, ry: number): number[] {
  const x0 = rx * CHUNK_W
  const y0 = ry * CHUNK_H
  return tilesAnchoredIn(map, x0 - EXPAND_X, x0 + CHUNK_W + EXPAND_X, y0 - EXPAND_DOWN, y0 + CHUNK_H + EXPAND_UP)
}

/**
 * Tiles whose buildings and roads change the picture of rectangle (rx, ry): those of chunkTiles plus every tile
 * the village yard of a house reaches in from (settlement radius, one more for the smooth blending between tile
 * centres and one for the ring of tiles next to a building).
 */
export function chunkDependencies(map: GameMap, rx: number, ry: number): number[] {
  const reach = world.settlement.radius + 2
  // a tile `reach` steps away lies at most reach * 2 * HALF_W sideways and reach * 2 * HALF_H up or down
  const growX = reach * 2 * HALF_W
  const growY = reach * 2 * HALF_H
  const x0 = rx * CHUNK_W
  const y0 = ry * CHUNK_H
  return tilesAnchoredIn(
    map,
    x0 - EXPAND_X - growX,
    x0 + CHUNK_W + EXPAND_X + growX,
    y0 - EXPAND_DOWN - growY,
    y0 + CHUNK_H + EXPAND_UP + growY,
  )
}

/** Indices of the tiles whose bottom corner lies in the given world rectangle. */
function tilesAnchoredIn(map: GameMap, minX: number, maxX: number, minY: number, maxY: number): number[] {
  const us: number[] = []
  const vs: number[] = []
  for (const [wx, wy] of [[minX, minY], [maxX, minY], [minX, maxY], [maxX, maxY]]) {
    us.push((wy / HALF_H + wx / HALF_W) / 2)
    vs.push((wy / HALF_H - wx / HALF_W) / 2)
  }
  const tx0 = Math.max(0, Math.floor(Math.min(...us)) - 1)
  const tx1 = Math.min(map.width - 1, Math.ceil(Math.max(...us)) + 1)
  const ty0 = Math.max(0, Math.floor(Math.min(...vs)) - 1)
  const ty1 = Math.min(map.height - 1, Math.ceil(Math.max(...vs)) + 1)
  const found: number[] = []
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const ax = (tx - ty) * HALF_W
      const ay = (tx + ty + 1) * HALF_H
      if (ax >= minX && ax <= maxX && ay >= minY && ay <= maxY) found.push(ty * map.width + tx)
    }
  }
  return found
}

/** Changes when a building or road appears or disappears on one of the tiles, or the paving or a garden of the town (`plots`, see TownGround.code) changes there. */
export function layoutSignature(tiles: number[], occupancy: number[], roads: number[], plots?: Uint8Array | null): number {
  let hash = 0
  for (const index of tiles) {
    if (occupancy[index] !== 0 || roads[index] !== 0) hash = (Math.imul(hash, 31) + index * 3 + (roads[index] ? 1 : 2)) | 0
    if (plots && plots[index] !== 0) hash = (Math.imul(hash, 37) + index * 8 + plots[index]) | 0
  }
  return hash
}

/** All objects (trees, peaks, tufts ...) of the given tiles with their base position in world pixels. */
export function decorOf(ctx: ChunkContext, tiles: number[]): { item: DecorItem; wx: number; wy: number }[] {
  const { map } = ctx
  const decorCtx = {
    map,
    seed: ctx.seed,
    climate: ctx.climate,
    blocked: (x: number, y: number) => ctx.occupancy[y * map.width + x] !== 0 || ctx.roads[y * map.width + x] !== 0,
  }
  const ring = surroundRing(map, ctx.occupancy, ctx.roads)
  const result: { item: DecorItem; wx: number; wy: number }[] = []
  for (const index of tiles) {
    const tx = index % map.width
    const ty = (index - tx) / map.width
    for (const item of decorForTile(decorCtx, tx, ty)) {
      // tall objects next to a building are drawn together with the building (see frontDecor.ts)
      if (ring[index] && isTall(item.kind)) continue
      // tufts and flowers do not grow in the worn yard between houses
      if (ctx.yard && ctx.yard[index] > world.settlement.decorHideAbove && !isTall(item.kind)) continue
      result.push({ item, wx: (item.x - item.y) * HALF_W, wy: (item.x + item.y) * HALF_H })
    }
  }
  return result
}

/** How trodden a tile is: full on roads, a little under buildings, less on the tiles beside them. */
const WEAR = { road: 1, building: 0.3, besideRoad: [0.1, 0.34], besideBuilding: [0, 0.16], corner: 0.5 }

const wearCache = new WeakMap<number[], { roads: number[]; yard: Float32Array | null; town: TownGround | null; field: Float32Array }>()

/**
 * How worn the ground of each tile is (0..1): people walk on and along the roads and around every building, and
 * the village yard of the houses (see settlement.ts) is part of it. The tiles beside a road or building are worn
 * unevenly, so the bare earth does not follow the tile grid.
 */
export function wearField(ctx: Pick<ChunkContext, 'map' | 'occupancy' | 'roads' | 'yard' | 'town'>): Float32Array {
  const hit = wearCache.get(ctx.occupancy)
  const town = ctx.town ?? null
  if (hit && hit.roads === ctx.roads && hit.yard === ctx.yard && hit.town === town) return hit.field
  const { width, height } = ctx.map
  const field = new Float32Array(width * height)
  const raise = (x: number, y: number, value: number): void => {
    if (x < 0 || y < 0 || x >= width || y >= height) return
    const index = y * width + x
    if (value > field[index]) field[index] = value
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x
      const road = ctx.roads[index] !== 0
      if (!road && ctx.occupancy[index] === 0) continue
      raise(x, y, road ? WEAR.road : WEAR.building)
      const [least, spread] = road ? WEAR.besideRoad : WEAR.besideBuilding
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          const beside = least + spread * hash2(x + dx, y + dy, 9311)
          raise(x + dx, y + dy, dx !== 0 && dy !== 0 ? beside * WEAR.corner : beside)
        }
      }
    }
  }
  if (ctx.yard) {
    const strength = world.settlement.strength
    for (let i = 0; i < field.length; i++) field[i] = Math.max(field[i], ctx.yard[i] * strength)
  }
  // nobody walks over a garden: there the grass stays
  if (town) for (let i = 0; i < field.length; i++) if (town.lawn[i]) field[i] = 0
  wearCache.set(ctx.occupancy, { roads: ctx.roads, yard: ctx.yard, town, field })
  return field
}

/** The wear at a fractional tile position (tile centres are the sample points). */
export function wearAt(field: Float32Array, width: number, height: number, u: number, v: number): number {
  const fx = u - 0.5
  const fy = v - 0.5
  const x0 = Math.floor(fx)
  const y0 = Math.floor(fy)
  const tx = fx - x0
  const ty = fy - y0
  const at = (x: number, y: number): number => (x < 0 || y < 0 || x >= width || y >= height ? 0 : field[y * width + x])
  return (at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx) * (1 - ty) + (at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx) * ty
}

/** How dark the shadows of trees, bushes and rocks lie on the ground: a crown lets some light through, so less than a wall's. */
const TREE_SHADOW = 0.46

/** How strongly the fine grain lies over grown and over bare ground. */
const GRAIN_ALPHA = { grown: 0.85, bare: 0.7 }

/**
 * Lays the fine grain over the ground of a rectangle: blades and clumps where `grownMask` is opaque, even grains
 * where `bareMask` is. The grain pictures repeat every GRAIN_SPAN world pixels, which the rectangle size is a
 * multiple of, so the grain runs on from one rectangle to the next.
 */
function layGrain(out: CanvasRenderingContext2D, width: number, height: number, scale: number, grownMask: HTMLCanvasElement, bareMask: HTMLCanvasElement): void {
  const grain = groundGrain()
  if (!grain) return
  const layer = document.createElement('canvas')
  layer.width = width
  layer.height = height
  const g = layer.getContext('2d')
  if (!g) return
  const zoom = scale / GRAIN_SCALE
  const tile = GRAIN_SPAN * GRAIN_SCALE * zoom
  for (const [picture, mask, alpha] of [[grain.grown, grownMask, GRAIN_ALPHA.grown], [grain.bare, bareMask, GRAIN_ALPHA.bare]] as const) {
    g.globalCompositeOperation = 'source-over'
    g.clearRect(0, 0, width, height)
    for (let y = 0; y < height; y += tile) for (let x = 0; x < width; x += tile) g.drawImage(picture, x, y, tile, tile)
    g.globalCompositeOperation = 'destination-in'
    g.drawImage(mask, 0, 0, width, height)
    out.globalCompositeOperation = 'overlay'
    out.globalAlpha = alpha
    out.drawImage(layer, 0, 0)
  }
  out.globalCompositeOperation = 'source-over'
  out.globalAlpha = 1
}

/**
 * Draws one rectangle of the terrain: the ground pixel by pixel (see paintGround), its fine grain, then every object that
 * reaches into the rectangle, back to front. Returns null if there is no land in or near it.
 */
export function renderChunk(rx: number, ry: number, tiles: number[], ctx: ChunkContext, scale: number): HTMLCanvasElement | null {
  const { map } = ctx
  if (!tiles.some((index) => map.tiles[index] !== Terrain.Water)) return null
  const x0 = rx * CHUNK_W
  const y0 = ry * CHUNK_H

  const ground = document.createElement('canvas')
  const grownMask = document.createElement('canvas')
  const bareMask = document.createElement('canvas')
  for (const layer of [ground, grownMask, bareMask]) {
    layer.width = CHUNK_W
    layer.height = CHUNK_H
  }
  const groundCtx = ground.getContext('2d')
  const grownCtx = grownMask.getContext('2d')
  const bareCtx = bareMask.getContext('2d')
  if (!groundCtx || !grownCtx || !bareCtx) return null
  const image = groundCtx.createImageData(CHUNK_W, CHUNK_H)
  const grown = grownCtx.createImageData(CHUNK_W, CHUNK_H)
  const bare = bareCtx.createImageData(CHUNK_W, CHUNK_H)
  // tiles with a building or road stay land under the rounded coast
  const solid = (x: number, y: number): boolean => ctx.occupancy[y * map.width + x] !== 0 || ctx.roads[y * map.width + x] !== 0
  const field = wearField(ctx)
  const wear = (u: number, v: number): number => wearAt(field, map.width, map.height, u, v)
  // flags lie in this rectangle only if one of its tiles is paved
  const town = ctx.town && tiles.some((index) => ctx.town!.paved[index] > 0) ? ctx.town : null
  const paved = town?.paved
  for (let y = 0; y < CHUNK_H; y++) {
    for (let x = 0; x < CHUNK_W; x++) {
      const offset = (y * CHUNK_W + x) * 4
      let share = paintGround(map, ctx.textures, ctx.seed, x0 + x + 0.5, y0 + y + 0.5, image.data, offset, solid, wear)
      if (share < 0) continue
      // where flags will lie nothing grows: the grain of stone goes there, not that of grass
      if (paved && share > 0 && pavedAt(paved, map.width, map.height, ((y0 + y + 0.5) / HALF_H + (x0 + x + 0.5) / HALF_W) / 2, ((y0 + y + 0.5) / HALF_H - (x0 + x + 0.5) / HALF_W) / 2) > 0.5) share = 0
      grown.data[offset + 3] = 255 * share
      bare.data[offset + 3] = image.data[offset + 3] * (1 - share)
    }
  }
  groundCtx.putImageData(image, 0, 0)
  grownCtx.putImageData(grown, 0, 0)
  bareCtx.putImageData(bare, 0, 0)

  const canvas = document.createElement('canvas')
  canvas.width = CHUNK_W * scale
  canvas.height = CHUNK_H * scale
  const out = canvas.getContext('2d')
  if (!out) return null
  out.imageSmoothingEnabled = true
  out.drawImage(ground, 0, 0, canvas.width, canvas.height)
  if (town) layFlags(out, town, map, x0, y0, scale, ctx.seed)
  layGrain(out, canvas.width, canvas.height, scale, grownMask, bareMask)
  out.scale(scale, scale)

  const objects = decorOf(ctx, tiles).sort((a, b) => a.wy - b.wy || a.wx - b.wx)
  // shadows first, all of them in one layer: where many trees stand, their shadows are one shade and not black
  const shade = document.createElement('canvas')
  shade.width = CHUNK_W
  shade.height = CHUNK_H
  const shadeCtx = shade.getContext('2d')
  if (shadeCtx) {
    for (const { item, wx, wy } of objects) if (isTall(item.kind)) drawDecorShadow(shadeCtx, item, wx - x0, wy - y0, LIGHT)
    out.globalAlpha = TREE_SHADOW
    out.drawImage(shade, 0, 0, CHUNK_W, CHUNK_H)
    out.globalAlpha = 1
  }
  for (const { item, wx, wy } of objects) {
    const sprite = decorSprite(item)
    if (!sprite) continue
    const height = sprite.height * decorScale(item) * item.scale
    const width = sprite.width * decorScale(item) * item.scale
    const left = wx - x0 - width / 2
    const top = wy - y0 - height
    if (left > CHUNK_W || left + width < 0 || top > CHUNK_H || top + height < 0) continue
    drawDecor(out, item, wx - x0, wy - y0, true)
    // every other tree is remembered: its crown moves in the wind (forestSway.ts)
    if (swaysHere(item.kind, wx, wy)) noteTree(canvas, left, top, width, height)
  }
  return canvas
}
