// Shadows of the afternoon sun, which stands in the top left: every building throws a long, soft, slightly blue
// shadow to the right and a little down, in the shape of its own outline, and where it meets the ground lies a dark
// contact shadow. The shadow is worked out once per picture from the picture itself: what stands solid on the plot
// and rises beyond it is the building, every column of it throws its height along the ground.
//
// It reaches the screen in two ways. On the ground around a building it is drawn before all buildings, so it falls
// on grass, sand, roads and yards. On the building's own plot, which is part of its picture, it is painted into the
// picture (see shadePlot, used by coastFade.ts when it makes the copy with the soft rim).
import { buildingRect } from '../sim/coverage'
import { LIGHT } from './built/light'
import { SHADOW_DEPTH } from './built/shadowCast'
import { layShadows } from './shadowLayer'
import type { IslandState } from '../sim/state'
import type { TileRange } from './buildingRenderer'
import type { FadeFrame } from './coastFade'
import { drawDecorShadow } from './decorDraw'
import { frontDecorIn } from './frontDecor'
import { HALF_H, HALF_W, tileToWorld } from './iso'
import { quarterBlocks } from './quarterRenderer'
import { placeSprite } from './spriteDraw'
import { buildingKey } from './spriteKeys'

export { LIGHT }
/** Colour of a shadow (cool, as the sky lights it) and how dark it is where it is deepest, and at the foot of a wall. */
const TINT = [20, 28, 58]
const DEPTH = 0.52
const CONTACT = 0.42
/** How dark the shadows of trees, bushes and rocks beside buildings are, as a share of the shadow of a wall. */
const DECOR_SHADOW = 0.72
/** A shadow gets lighter towards its tip: by this share over this many world pixels of height. */
const THIN = { share: 0.35, over: 80 }
/** Free cells around the shadow, so its soft edge is not cut off. */
const PAD = 5
/** Along the front edges of a plot (in tiles) lies ground only: its colours tell ground from building. */
const GROUND_STRIP = 0.3
const COMMON_SHARE = 0.004
const OUTLINE_DARK = 58
/** Something lower than this many world pixels throws no shadow. */
const MIN_HEIGHT = 4
/** A solid thing smaller than this many cells is no building. */
const MIN_CELLS = 14
/** How steeply the foot of a wall runs across the screen: a tile edge falls one pixel for every two. */
const SLOPE = HALF_H / HALF_W
/** A plot may be painted this far beyond its footprint, in tiles. */
const RIM = 0.12

/** The shadow of one building picture, one cell per world pixel. */
export interface ShadowMap {
  /** Size of the map and where the top left of the picture lies in it (cells). */
  width: number
  height: number
  left: number
  top: number
  /** How dark each cell is, 0 to 1: cast shadow and contact shadow together. */
  dark: Float32Array
  /** Size of the picture in cells and which of its cells are the building (1) and not ground or air. */
  cellsWide: number
  cellsHigh: number
  body: Uint8Array
}

/**
 * Works out the shadow of a building picture (RGBA, `frame` says where its footprint lies; a mirrored picture is
 * read mirrored, so the map is as the building stands on screen). Pure: no canvas, so it can be tested.
 */
export function shadowMap(data: Uint8ClampedArray, width: number, height: number, frame: FadeFrame): ShadowMap {
  const step = frame.scale
  const cw = Math.ceil(width / step)
  const ch = Math.ceil(height / step)
  // the pixel in the middle of a cell
  const offsetOf = (cx: number, cy: number): number => {
    const x = Math.min(width - 1, Math.floor((cx + 0.5) * step))
    const y = Math.min(height - 1, Math.floor((cy + 0.5) * step))
    return (y * width + (frame.mirrored ? width - 1 - x : x)) * 4
  }
  const bin = (o: number): number => ((data[o] >> 4) << 8) | ((data[o + 1] >> 4) << 4) | (data[o + 2] >> 4)
  // 0 air, 1 inside the footprint, 2 beyond it
  const where = new Uint8Array(cw * ch)
  const counts = new Uint32Array(4096)
  let counted = 0
  for (let cy = 0; cy < ch; cy++) {
    for (let cx = 0; cx < cw; cx++) {
      const o = offsetOf(cx, cy)
      if (data[o + 3] < 128) continue
      const px = ((cx + 0.5) * step - frame.originX) / step / HALF_W
      const py = ((cy + 0.5) * step - frame.originY) / step / HALF_H
      const u = (px + py) / 2
      const v = (py - px) / 2
      // a little beyond the footprint is still plot: painted rims are not drawn to the pixel
      const inside = u >= -RIM && v >= -RIM && u <= frame.w + RIM && v <= frame.h + RIM
      where[cy * cw + cx] = inside ? 1 : 2
      if (inside && Math.min(frame.w - u, frame.h - v) < GROUND_STRIP) {
        counts[bin(o)]++
        counted++
      }
    }
  }
  const least = Math.max(2, counted * COMMON_SHARE)
  const isGround = (cx: number, cy: number): boolean => {
    if (where[cy * cw + cx] !== 1) return false
    const o = offsetOf(cx, cy)
    return counts[bin(o)] >= least && 0.3 * data[o] + 0.59 * data[o + 1] + 0.11 * data[o + 2] >= OUTLINE_DARK
  }
  // What is not ground stands on the plot. Thin things (fences, poles, the timber of a hoist) are left out: a cell
  // counts only if its four neighbours stand too. What remains falls into separate solid things.
  const stands = (cx: number, cy: number): boolean => cx >= 0 && cy >= 0 && cx < cw && cy < ch && where[cy * cw + cx] !== 0 && !isGround(cx, cy)
  const solid = new Uint8Array(cw * ch)
  for (let cy = 1; cy < ch - 1; cy++) {
    for (let cx = 1; cx < cw - 1; cx++) {
      if (stands(cx, cy) && stands(cx - 1, cy) && stands(cx + 1, cy) && stands(cx, cy - 1) && stands(cx, cy + 1)) solid[cy * cw + cx] = 1
    }
  }
  const body = new Uint8Array(cw * ch)
  const seen = new Uint8Array(cw * ch)
  const walls: { x: number; foot: number; rise: number }[] = []
  let tallest = 0
  const tops = new Int32Array(cw)
  const lows = new Int32Array(cw)
  const stack: number[] = []
  for (let start = 0; start < solid.length; start++) {
    if (!solid[start] || seen[start]) continue
    // one solid thing: its highest and lowest cell in every column
    tops.fill(-1)
    lows.fill(-1)
    let cells = 0
    let beyond = false
    let from = cw
    let to = -1
    seen[start] = 1
    stack.push(start)
    while (stack.length > 0) {
      const i = stack.pop()!
      const cx = i % cw
      const cy = (i - cx) / cw
      cells++
      if (where[i] === 2) beyond = true
      if (tops[cx] < 0 || cy < tops[cx]) tops[cx] = cy
      if (cy > lows[cx]) lows[cx] = cy
      from = Math.min(from, cx)
      to = Math.max(to, cx)
      for (const n of [i + 1, i - 1, i + cw, i - cw]) {
        if (n < 0 || n >= solid.length || !solid[n] || seen[n]) continue
        seen[n] = 1
        stack.push(n)
      }
    }
    // a building rises beyond its footprint; a patch of odd-coloured ground does not
    if (!beyond || cells < MIN_CELLS) continue
    // and only the columns that do rise beyond it are building: a bed or a path that touches the wall is left out
    for (let cx = from; cx <= to; cx++) if (tops[cx] >= 0 && where[tops[cx] * cw + cx] !== 2) tops[cx] = -1
    // Where it stands: seen from this side, the foot of a building is a V along the two front edges of its base
    // (a tile edge falls one pixel per two). The V is laid as high as it can lie under all its cells: walls
    // whose colours look like ground are then part of the building too, down to their foot.
    let frontX = from
    let frontY = Infinity
    for (let cx = from; cx <= to; cx++) {
      let needed = -Infinity
      for (let x = from; x <= to; x++) if (tops[x] >= 0) needed = Math.max(needed, lows[x] + Math.abs(x - cx) * SLOPE)
      if (needed < frontY) {
        frontY = needed
        frontX = cx
      }
    }
    for (let cx = from; cx <= to; cx++) {
      if (tops[cx] < 0) continue
      // one cell more on each side: the rim that was left out as thin
      const top = Math.max(0, tops[cx] - 1)
      const foot = Math.min(ch, Math.round(frontY - Math.abs(cx - frontX) * SLOPE) + 2)
      for (let cy = top; cy < foot; cy++) body[cy * cw + cx] = 1
      const rise = foot - top
      if (rise < MIN_HEIGHT) continue
      walls.push({ x: cx, foot, rise })
      tallest = Math.max(tallest, rise)
    }
  }
  const mapWidth = cw + Math.ceil(tallest * LIGHT.x) + 2 * PAD
  const mapHeight = ch + Math.ceil(tallest * LIGHT.y) + 2 * PAD
  const cast = new Float32Array(mapWidth * mapHeight)
  const contact = new Float32Array(mapWidth * mapHeight)
  const put = (map: Float32Array, x: number, y: number, value: number): void => {
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    if (x0 < 0 || y0 < 0 || x0 + 1 >= mapWidth || y0 + 1 >= mapHeight) return
    const fx = x - x0
    const fy = y - y0
    const set = (i: number, share: number): void => {
      if (value * share > map[i]) map[i] = value * share
    }
    // the nearest cell takes all, its neighbours their share: neighbouring columns close up to one area
    set(y0 * mapWidth + x0, Math.max(1 - fx, 0.75) * Math.max(1 - fy, 0.75))
    set(y0 * mapWidth + x0 + 1, Math.max(fx, 0.75) * Math.max(1 - fy, 0.75))
    set((y0 + 1) * mapWidth + x0, Math.max(1 - fx, 0.75) * Math.max(fy, 0.75))
    set((y0 + 1) * mapWidth + x0 + 1, Math.max(fx, 0.75) * Math.max(fy, 0.75))
  }
  for (const wall of walls) {
    for (let t = 0; t <= wall.rise; t += 0.5) {
      put(cast, PAD + wall.x + LIGHT.x * t, PAD + wall.foot + LIGHT.y * t, 1 - THIN.share * Math.min(1, t / THIN.over))
    }
    put(contact, PAD + wall.x, PAD + wall.foot, 1)
  }
  soften(cast, mapWidth, mapHeight, 1)
  soften(cast, mapWidth, mapHeight, 1)
  soften(contact, mapWidth, mapHeight, 2)
  const dark = new Float32Array(mapWidth * mapHeight)
  for (let i = 0; i < dark.length; i++) dark[i] = 1 - (1 - Math.min(1, cast[i]) * DEPTH) * (1 - Math.min(1, contact[i] * 1.6) * CONTACT)
  return { width: mapWidth, height: mapHeight, left: PAD, top: PAD, dark, cellsWide: cw, cellsHigh: ch, body }
}

/** Blurs a map in place: every cell becomes the mean of the cells up to `radius` away. */
function soften(map: Float32Array, width: number, height: number, radius: number): void {
  const line = new Float32Array(Math.max(width, height))
  const pass = (count: number, length: number, at: (index: number, k: number) => number): void => {
    for (let index = 0; index < count; index++) {
      for (let k = 0; k < length; k++) line[k] = map[at(index, k)]
      for (let k = 0; k < length; k++) {
        let sum = 0
        let n = 0
        for (let d = -radius; d <= radius; d++) {
          if (k + d < 0 || k + d >= length) continue
          sum += line[k + d]
          n++
        }
        map[at(index, k)] = sum / n
      }
    }
  }
  pass(height, width, (y, x) => y * width + x)
  pass(width, height, (x, y) => y * width + x)
}

/**
 * Paints the shadow of a building on its own plot, into its picture (RGBA in place): the ground in the shadow turns
 * darker and bluer, the building itself stays as it is. Pure.
 */
export function shadePlot(data: Uint8ClampedArray, width: number, height: number, frame: FadeFrame): void {
  const map = shadowMap(data, width, height, frame)
  const step = frame.scale
  for (let iy = 0; iy < height; iy++) {
    for (let ix = 0; ix < width; ix++) {
      const o = (iy * width + ix) * 4
      if (data[o + 3] === 0) continue
      const sx = frame.mirrored ? width - 1 - ix : ix
      const fx = (sx + 0.5) / step - 0.5
      const fy = (iy + 0.5) / step - 0.5
      // between the cells the building ends softly, so no steps of a cell show at the foot of a wall
      const share = darkAt(map, fx + map.left, fy + map.top) * (1 - bodyAt(map, fx, fy))
      if (share < 0.01) continue
      for (let k = 0; k < 3; k++) data[o + k] = data[o + k] + (TINT[k] - data[o + k]) * share
    }
  }
}

/** How much of a place between the cells of the picture is building, 0 to 1. */
function bodyAt(map: ShadowMap, x: number, y: number): number {
  const x0 = Math.max(0, Math.min(map.cellsWide - 2, Math.floor(x)))
  const y0 = Math.max(0, Math.min(map.cellsHigh - 2, Math.floor(y)))
  const fx = Math.max(0, Math.min(1, x - x0))
  const fy = Math.max(0, Math.min(1, y - y0))
  const i = y0 * map.cellsWide + x0
  const { body } = map
  return (body[i] * (1 - fx) + body[i + 1] * fx) * (1 - fy) + (body[i + map.cellsWide] * (1 - fx) + body[i + map.cellsWide + 1] * fx) * fy
}

/** The darkness between the cells of a map. */
function darkAt(map: ShadowMap, x: number, y: number): number {
  const x0 = Math.max(0, Math.min(map.width - 2, Math.floor(x)))
  const y0 = Math.max(0, Math.min(map.height - 2, Math.floor(y)))
  const fx = Math.max(0, Math.min(1, x - x0))
  const fy = Math.max(0, Math.min(1, y - y0))
  const i = y0 * map.width + x0
  const { dark } = map
  return (dark[i] * (1 - fx) + dark[i + 1] * fx) * (1 - fy) + (dark[i + map.width] * (1 - fx) + dark[i + map.width + 1] * fx) * fy
}

interface Cast {
  picture: HTMLCanvasElement
  /** World pixels from the top left of the building picture to the top left of the shadow picture. */
  left: number
  top: number
}

const casts = new Map<string, Cast | null>()
const MAX_CASTS = 160

/** The shadow of a building picture as a small picture of its own, one pixel per world pixel. Made once per picture. */
function castOf(id: string, image: CanvasImageSource, width: number, height: number, frame: FadeFrame): Cast | null {
  const hit = casts.get(id)
  if (hit !== undefined) return hit
  let made: Cast | null = null
  const cw = Math.max(1, Math.round(width))
  const ch = Math.max(1, Math.round(height))
  const small = document.createElement('canvas')
  small.width = cw
  small.height = ch
  const g = small.getContext('2d', { willReadFrequently: true })
  if (g) {
    // read as it stands on screen: a mirrored building throws its shadow to the right like every other
    if (frame.mirrored) {
      g.translate(cw, 0)
      g.scale(-1, 1)
    }
    g.drawImage(image, 0, 0, cw, ch)
    const map = shadowMap(g.getImageData(0, 0, cw, ch).data, cw, ch, { ...frame, mirrored: false })
    const picture = document.createElement('canvas')
    picture.width = map.width
    picture.height = map.height
    const p = picture.getContext('2d')
    if (p) {
      const pixels = p.createImageData(map.width, map.height)
      for (let i = 0; i < map.dark.length; i++) {
        pixels.data[i * 4] = TINT[0]
        pixels.data[i * 4 + 1] = TINT[1]
        pixels.data[i * 4 + 2] = TINT[2]
        pixels.data[i * 4 + 3] = 255 * map.dark[i]
      }
      p.putImageData(pixels, 0, 0)
      made = { picture, left: -map.left, top: -map.top }
    }
  }
  if (casts.size >= MAX_CASTS) casts.clear()
  casts.set(id, made)
  return made
}

/**
 * Draws the shadows the buildings throw on the ground around them, and those of the trees, bushes and rocks that
 * stand beside them. Before the buildings, after the ground. All of them are laid down as one (see shadowLayer.ts).
 */
export function drawShadows(ctx: CanvasRenderingContext2D, state: IslandState, range: TileRange): void {
  const blocks = quarterBlocks(state)
  layShadows(ctx, SHADOW_DEPTH, (g) => {
    for (const building of state.buildings) {
      const rect = buildingRect(building)
      if (rect.x > range.maxI + 5 || rect.x + rect.w < range.minI - 5 || rect.y > range.maxJ + 5 || rect.y + rect.h < range.minJ - 5) continue
      const block = building.quarter !== undefined ? (blocks.get(building.quarter) ?? null) : null
      const key = buildingKey(building, block)
      const placed = placeSprite(building, key)
      if (!placed) continue
      if (placed.made) {
        const cast = placed.made.shadow
        if (cast) g.drawImage(cast.canvas, placed.x + cast.left, placed.y + cast.top)
        continue
      }
      // a painted picture: its shadow is read from the picture and already has its strength, so it goes straight on the ground
      const corner = tileToWorld(rect.x, rect.y)
      const frame: FadeFrame = { originX: corner.x - placed.x, originY: corner.y - placed.y, scale: 1, w: rect.w, h: rect.h, mirrored: placed.mirrored }
      const cast = castOf(`${key}|${placed.mirrored ? 'm' : ''}|${rect.w}x${rect.h}`, placed.image, placed.width, placed.height, frame)
      if (cast) ctx.drawImage(cast.picture, placed.x + cast.left, placed.y + cast.top)
    }
    // a crown lets some light through: its shadow is not as dark as that of a wall
    g.globalAlpha = DECOR_SHADOW
    for (const decor of frontDecorIn(state, range)) {
      // hedges, beds, gardens and what stands about in a yard carry their own shade in their picture
      if (decor.item.kind !== 'bed' && decor.item.kind !== 'hedge' && decor.item.kind !== 'garden' && decor.item.kind !== 'yard') drawDecorShadow(g, decor.item, decor.wx, decor.wy, LIGHT)
    }
    g.globalAlpha = 1
  })
}
