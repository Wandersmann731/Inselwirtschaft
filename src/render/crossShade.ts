// A shadow does not stop at the next plot. The buildings throw their shadows on the ground before any of them is
// drawn, and each building picture brings its own plot along, which would cover the shadow of its neighbour. So
// after a building is drawn, the shadows of the others are laid over its foot once more: over the ground at the
// front of its plot and up the lowest part of its walls, fading with the height. That is what makes a lane between
// two houses dark, and a row of houses one street instead of pictures set side by side.
import { buildingRect } from '../sim/coverage'
import type { IslandState } from '../sim/state'
import { LIGHT } from './built/light'
import { SHADOW_DEPTH } from './built/shadowCast'
import { tileToWorld } from './iso'
import { placeSprite, type SpritePlacement } from './spriteDraw'
import type { TileRect } from './shapes'

type Building = IslandState['buildings'][number]

/** How high up a wall the shadow of a neighbour is carried, in world pixels: at its foot all of it, above this none. */
export const SHADE_BAND = 30
/** Overlays made per frame at most: after a building comes or goes they are made again a few at a time. */
const PER_FRAME = 6

/** How much of a neighbour's shadow shows on a wall at a height above the ground (world pixels). Pure. */
export function shadeAtHeight(height: number): number {
  return Math.max(0, Math.min(1, 1 - height / SHADE_BAND))
}

interface Entry {
  buildings: unknown
  canvas: HTMLCanvasElement | null
}

const entries = new Map<number, Entry>()
let island = -1
let madeNow = 0
let mask: HTMLCanvasElement | null = null
let upper: HTMLCanvasElement | null = null

/** A neighbour throws its shadow on a roof only if it stands this much higher than the house (as a share of the house). */
export const TALLER = 1.2

/**
 * Where a shadow that lies at a place on the ground shows on a level surface `high` world pixels above it: nearer
 * to what throws it, and higher on the screen. Pure.
 */
export function liftedShadow(high: number): [number, number] {
  return [-LIGHT.x * high, -LIGHT.y * high - high]
}

/** Called once per frame, before the buildings are drawn. */
export function beginCrossShade(state: IslandState): void {
  if (state.id !== island) {
    island = state.id
    entries.clear()
  }
  madeNow = 0
}

function overlay(state: IslandState, building: Building, rect: TileRect, placed: SpritePlacement): HTMLCanvasElement | null {
  const [w, h] = [Math.ceil(placed.width), Math.ceil(placed.height)]
  let canvas: HTMLCanvasElement | null = null
  let g: CanvasRenderingContext2D | null = null
  let roofs: CanvasRenderingContext2D | null = null
  for (const other of state.buildings) {
    if (other === building) continue
    const near = buildingRect(other)
    if (near.x > rect.x + rect.w + 1 || near.x + near.w < rect.x - 5 || near.y > rect.y + rect.h + 3 || near.y + near.h < rect.y - 3) continue
    const there = placeSprite(other)
    const cast = there?.made?.shadow
    if (!there || !cast) continue
    const [x, y] = [there.x + cast.left - placed.x, there.y + cast.top - placed.y]
    if (x > w || y > h || x + cast.canvas.width < 0 || y + cast.canvas.height < 0) continue
    if (!canvas) {
      canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      g = canvas.getContext('2d')
    }
    g?.drawImage(cast.canvas, x, y)
    // a neighbour that stands well above this building also shades its roof: there its shadow lies as on a floor at the height of the eaves
    if (there.rise > placed.rise * TALLER) {
      upper ??= document.createElement('canvas')
      if (!roofs) {
        if (upper.width < w || upper.height < h) {
          upper.width = Math.max(upper.width, w)
          upper.height = Math.max(upper.height, h)
        }
        roofs = upper.getContext('2d')
        if (roofs) {
          roofs.globalCompositeOperation = 'source-over'
          roofs.clearRect(0, 0, upper.width, upper.height)
        }
      }
      const [dx, dy] = liftedShadow(placed.rise * 0.75)
      roofs?.drawImage(cast.canvas, x + dx, y + dy)
    }
  }
  if (!canvas || !g) return null
  // only where the building's own picture is, and only at its foot: the ground at the front and the wall above it
  mask ??= document.createElement('canvas')
  if (mask.width < w || mask.height < h) {
    mask.width = Math.max(mask.width, w)
    mask.height = Math.max(mask.height, h)
  }
  const m = mask.getContext('2d')
  if (!m) return null
  m.globalCompositeOperation = 'source-over'
  m.clearRect(0, 0, mask.width, mask.height)
  const corner = (u: number, v: number): [number, number] => {
    const at = tileToWorld(u, v)
    return [at.x - placed.x, at.y - placed.y]
  }
  const south = corner(rect.x + rect.w, rect.y + rect.h)
  for (const [from, up] of [[corner(rect.x, rect.y + rect.h), [0.447, -0.894]], [corner(rect.x + rect.w, rect.y), [-0.447, -0.894]]] as [[number, number], [number, number]][]) {
    // lines of equal height on a wall run along its foot: the shade fades across them
    const run = m.createLinearGradient(south[0], south[1] + 6, south[0] + up[0] * (SHADE_BAND + 6) * 0.894, south[1] + 6 + up[1] * (SHADE_BAND + 6) * 0.894)
    run.addColorStop(0, 'rgba(0, 0, 0, 1)')
    run.addColorStop(6 / (SHADE_BAND + 6), 'rgba(0, 0, 0, 1)')
    run.addColorStop(1, 'rgba(0, 0, 0, 0)')
    m.fillStyle = run
    m.beginPath()
    m.moveTo(from[0], from[1] + 6)
    m.lineTo(south[0], south[1] + 6)
    m.lineTo(south[0], south[1] - SHADE_BAND)
    m.lineTo(from[0], from[1] - SHADE_BAND)
    m.closePath()
    m.fill()
  }
  m.globalCompositeOperation = 'destination-in'
  m.drawImage(placed.image, 0, 0, placed.width, placed.height)
  g.globalCompositeOperation = 'destination-in'
  g.drawImage(mask, 0, 0)
  if (roofs && upper) {
    // only above the walls: what of the picture lies higher than its eaves
    const eaves = placed.rise * 0.6
    const [west, east] = [corner(rect.x, rect.y + rect.h), corner(rect.x + rect.w, rect.y)]
    roofs.globalCompositeOperation = 'destination-in'
    roofs.beginPath()
    for (const [x, y] of [[0, 0], [w, 0], [w, east[1] - eaves], [east[0], east[1] - eaves], [south[0], south[1] - eaves], [west[0], west[1] - eaves], [0, west[1] - eaves]]) roofs.lineTo(x, y)
    roofs.closePath()
    roofs.fill()
    roofs.drawImage(placed.image, 0, 0, placed.width, placed.height)
    g.globalCompositeOperation = 'source-over'
    g.globalAlpha = 0.8
    g.drawImage(upper, 0, 0)
    g.globalAlpha = 1
  }
  return canvas
}

/**
 * Which way a house differs from its neighbours of the same plan, from -2 to 2: darker and cooler (in need of
 * whitewash), dusty, as it was painted (0), bleached by the sun, warm. Always the same for the same house. Pure.
 */
export function toneOf(id: number): number {
  return ((Math.imul(id, 2654435761) >>> 0) % TONES.length) - 2
}

/** The washes: darker and cooler, dusty and grey, none, sun-bleached, warm. */
const TONES: (string | null)[] = ['rgba(26, 28, 54, 0.12)', 'rgba(120, 112, 100, 0.12)', null, 'rgba(255, 238, 204, 0.1)', 'rgba(150, 96, 50, 0.08)']

const washes = new WeakMap<object, (HTMLCanvasElement | null)[]>()

/**
 * Lays that shade over a house that has just been drawn: a thin wash of colour in the shape of its picture, kept
 * once per picture at half its size.
 */
export function drawTone(ctx: CanvasRenderingContext2D, id: number, placed: SpritePlacement): void {
  const slot = toneOf(id) + 2
  const wash = TONES[slot]
  if (!wash) return
  let kept = washes.get(placed.image)
  if (!kept) {
    kept = TONES.map(() => null)
    washes.set(placed.image, kept)
  }
  if (!kept[slot]) {
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.ceil(placed.width / 2))
    canvas.height = Math.max(1, Math.ceil(placed.height / 2))
    const g = canvas.getContext('2d')
    if (!g) return
    g.drawImage(placed.image, 0, 0, canvas.width, canvas.height)
    g.globalCompositeOperation = 'source-in'
    g.fillStyle = wash
    g.fillRect(0, 0, canvas.width, canvas.height)
    kept[slot] = canvas
  }
  ctx.drawImage(kept[slot]!, placed.x, placed.y, placed.width, placed.height)
}

/** Lays the shadows of the neighbours over the foot of a building that has just been drawn. */
export function drawCrossShade(ctx: CanvasRenderingContext2D, state: IslandState, building: Building, rect: TileRect, placed: SpritePlacement): void {
  let entry = entries.get(building.id)
  if (!entry || entry.buildings !== state.buildings) {
    // the old one shows until its turn comes: a shadow a frame late is better than a frame that stalls
    if (madeNow < PER_FRAME) {
      madeNow++
      entry = { buildings: state.buildings, canvas: overlay(state, building, rect, placed) }
      entries.set(building.id, entry)
      // buildings that were torn down are forgotten now and then
      if (entries.size > state.buildings.length * 2 + 50) {
        const alive = new Set(state.buildings.map((b) => b.id))
        for (const id of entries.keys()) if (!alive.has(id)) entries.delete(id)
      }
    }
  }
  if (!entry?.canvas) return
  // the overlay holds the shapes of the shadows; like those on the ground they are as dark as one shadow
  ctx.globalAlpha = SHADOW_DEPTH
  ctx.drawImage(entry.canvas, placed.x, placed.y)
  ctx.globalAlpha = 1
}
