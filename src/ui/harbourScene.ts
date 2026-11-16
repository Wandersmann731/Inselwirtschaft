// The picture behind the start menu: a harbour town on its island in the evening light, ships before it, mountains
// far off. It is not a painting that is loaded but a scene put together by code from what the game itself builds:
// the same houses, church, mill, trees and ships, set on an island of sand and grass (harbourGround.ts) in the evening sea.
import { getBuilding } from '../data'
import { allowBuilding, built, builtKept, forgetBuilt } from '../render/built'
import { forgetGrown, grown, grownKept, grownScale } from '../render/grown'
import { forgetShips, SHIP_ORIGIN, SHIP_SIZE, shipPicture, shipsKept } from '../render/vessel/ship'
import { hash2 } from '../world/noise2d'
import { paintGround } from './harbourGround'
import { drawSails, sailAngle } from '../render/built/sails'
import { plotOf } from '../render/built/plots'
import { SHADOW_DEPTH } from '../render/built/shadowCast'
import { WaterPattern } from '../render/water'


/** What stands on the island: buildings by their picture and where their plot begins (tiles), trees by kind. */
export const TOWN: [string, number, number][] = [
  ['church', 0.4, 0.2], ['house_aristocrats', 5, 0.3], ['house_aristocrats_5', 7.3, 0.5], ['mill', 9.5, 0.9],
  ['house_merchants', 5, 3], ['house_merchants_2', 7.2, 3], ['house_merchants_4', 9.5, 3.2], ['house_merchants_6', 5, 5.5],
  ['house_merchants_5', 7.2, 5.5], ['market_house', 9.6, 5.7], ['house_citizens_3', 0.8, 6], ['house_citizens', 3, 6.1],
  ['house_settlers_2', 0.6, 8.3], ['fishery', 2.8, 8.6], ['kontor', 5.4, 8.3], ['shipyard', 8, 8.2],
]
export const GREEN: [string, number, number, number, number][] = [
  ['pine', 1, -0.6, 0.2, 1.1], ['pine', 2, 0.6, -0.8, 1], ['tree', 1, 4.9, -0.7, 1.1], ['tree', 3, 6.6, -0.9, 1], ['pine', 3, 8.4, -0.6, 1.1],
  ['tree', 2, 11.6, 1.8, 1.1], ['tree', 4, 12, 4.6, 1], ['pine', 1, -0.9, 2.4, 1], ['tree', 1, -0.8, 5.2, 1.1], ['bush', 1, 4.6, 2.6, 1],
  ['bush', 2, 11.9, 6.6, 1], ['tree', 3, 4.5, 7.9, 0.8], ['palm', 1, 11.6, 9.4, 1], ['palm', 2, -0.4, 10.4, 1], ['palm', 1, 4.4, 11.3, 0.9],
  ['rock', 2, 12.6, 8.2, 1], ['rock', 1, -1.2, 8.4, 0.9], ['bush', 3, 7.6, 2.6, 0.9],
]
/** Ships on the water: which of the eight headings, and where (tiles from the island's back corner). */
export const FLEET: [number, number, number, number][] = [[3, 2.6, 14.6, 1], [1, 13.4, 13.2, 0.9], [5, 16.8, 5.4, 0.7], [7, -4.5, 4.5, 0.6]]

/** A part of the canvas, in canvas pixels. */
export interface Area {
  x: number
  y: number
  w: number
  h: number
}

/** The island with its beach, in world pixels around the tile (0, 0): where its middle lies and how much room it takes. */
const ISLAND = { x: 9.6, y: 177.6, w: 920, h: 440, above: 60 }

/** How much of the island a part of the screen can show: the larger, the better. */
const roomIn = (area: Area): number => Math.min(area.w / ISLAND.w, area.h / (ISLAND.h + ISLAND.above))

/** The part of the screen (`w` by `h`) beside, under or over the menu `panel` in which the island shows largest. Pure. */
export function freeBeside(w: number, h: number, panel: Area | null): Area {
  if (!panel) return { x: 0, y: 0, w, h }
  const areas: Area[] = [
    { x: panel.x + panel.w, y: 0, w: w - panel.x - panel.w, h },
    { x: 0, y: 0, w: panel.x, h },
    { x: 0, y: panel.y + panel.h, w, h: h - panel.y - panel.h },
    { x: 0, y: 0, w, h: panel.y },
  ]
  return areas.reduce((best, area) => (roomIn(area) > roomIn(best) ? area : best))
}

/**
 * Where the island lies so that the town stands in the part of the picture the menu leaves `free`: the size of a
 * world pixel, where the tile (0, 0) comes to lie, and how high the horizon may stand above the island. Pure.
 */
export function islandPlace(W: number, H: number, free: Area): { s: number; origin: [number, number]; horizon: number } {
  const s = Math.max(Math.min(free.w / ISLAND.w, free.h / (ISLAND.h + ISLAND.above)), Math.min(W, H) / 1500)
  // the island sits at the foot of its room, so that sea and sky have theirs above it
  const middle = Math.min(free.y + free.h - H * 0.05 - (ISLAND.h / 2) * s, free.y + free.h / 2 + (ISLAND.above / 2) * s)
  const origin: [number, number] = [free.x + free.w / 2 - ISLAND.x * s, middle - ISLAND.y * s]
  return { s, origin, horizon: Math.max(H * 0.14, Math.min(H * 0.3, middle - (ISLAND.h / 2) * s - H * 0.03)) }
}

/** The plots of the town whose houses stand on stone flags (see built/plots.ts), by their first tile. Pure. */
export function flaggedPlots(): [number, number][] {
  const plots: [number, number][] = []
  for (const [name, u, v] of TOWN) {
    const house = /^house_([a-z]+?)(?:_(\d))?$/.exec(name)
    if (house && plotOf(house[1], house[2] ? Number(house[2]) - 1 : 0).ground === 'flags') plots.push([u, v])
  }
  return plots
}

/** What was kept of pictures before the scene was first painted: all that came after was made for it alone. */
let before: { built: Set<string>; grown: Set<string>; ships: Set<number> } | null = null

/**
 * Lets go of the large pictures that were only made for the scene (a church, villas, mountains, ships: some 40 MB),
 * when the menu closes. What the game needs of them it makes again, a few per frame.
 */
export function releaseHarbour(): void {
  if (!before) return
  const kept = before
  before = null
  forgetBuilt(builtKept().filter((id) => !kept.built.has(id)))
  forgetGrown(grownKept().filter((id) => !kept.grown.has(id)))
  forgetShips(shipsKept().filter((sector) => !kept.ships.has(sector)))
}

/**
 * Paints the scene into a canvas of any size; `unit` is the size of one CSS pixel in canvas pixels, `free` the part
 * of the canvas the menu does not cover (all of it if none is given).
 */
export function paintHarbour(canvas: HTMLCanvasElement, unit: number, free?: Area): void {
  const g = canvas.getContext('2d')
  if (!g) return
  const [W, H] = [canvas.width, canvas.height]
  before ??= { built: new Set(builtKept()), grown: new Set(grownKept()), ships: new Set(shipsKept()) }
  // the menu may be opened from a running game, where pictures are only made a few per frame: here all are wanted now
  allowBuilding(Infinity)
  const { s, origin, horizon } = islandPlace(W, H, free ?? { x: 0, y: 0, w: W, h: H })
  // sky, from the blue overhead to the gold over the horizon, and the low sun
  const sky = g.createLinearGradient(0, 0, 0, horizon)
  sky.addColorStop(0, '#2c5f84')
  sky.addColorStop(0.55, '#76a9b8')
  sky.addColorStop(1, '#f6d9a0')
  g.fillStyle = sky
  g.fillRect(0, 0, W, horizon)
  const sun: [number, number] = [W * 0.74, horizon * 0.9]
  const glow = g.createRadialGradient(sun[0], sun[1], 0, sun[0], sun[1], W * 0.5)
  glow.addColorStop(0, 'rgba(255, 244, 206, 0.95)')
  glow.addColorStop(0.08, 'rgba(255, 226, 160, 0.6)')
  glow.addColorStop(0.5, 'rgba(255, 200, 130, 0.14)')
  glow.addColorStop(1, 'rgba(255, 200, 130, 0)')
  g.fillStyle = glow
  g.fillRect(0, 0, W, horizon)
  // clouds: long, flat, lit from below
  for (let i = 0; i < 9; i++) {
    const [x, y] = [hash2(i, 1, 71) * W, horizon * (0.12 + 0.6 * hash2(i, 2, 71))]
    for (let k = 0; k < 6; k++) {
      g.fillStyle = `rgba(255, ${232 + k * 3}, ${206 + k * 6}, 0.11)`
      g.beginPath()
      g.ellipse(x + (hash2(i, k, 72) - 0.5) * W * 0.14, y + (hash2(i, k, 73) - 0.5) * horizon * 0.06, W * (0.05 + 0.07 * hash2(i, k, 74)), horizon * (0.02 + 0.03 * hash2(i, k, 75)), 0, 0, Math.PI * 2)
      g.fill()
    }
  }
  // far mountains, pale in the haze
  for (const [variant, x, scale] of [[1, 0.1, 1.5], [3, 0.3, 1.1], [2, 0.92, 1.7], [1, 0.58, 0.9]] as [number, number, number][]) {
    const peak = grown('peak_large', variant)
    if (!peak) continue
    const [pw, ph] = [peak.width * grownScale('peak_large') * scale * unit, peak.height * grownScale('peak_large') * scale * unit * 0.8]
    g.globalAlpha = 0.5
    g.drawImage(peak, x * W - pw / 2, horizon - ph * 0.86, pw, ph)
    g.globalAlpha = 1
  }
  const haze = g.createLinearGradient(0, horizon * 0.5, 0, horizon)
  haze.addColorStop(0, 'rgba(206, 214, 204, 0)')
  haze.addColorStop(1, 'rgba(246, 222, 176, 0.7)')
  g.fillStyle = haze
  g.fillRect(0, horizon * 0.5, W, horizon * 0.5)
  // the sea: light and green near the horizon, deep and blue towards the viewer
  const sea = g.createLinearGradient(0, horizon, 0, H)
  sea.addColorStop(0, '#8fbdb6')
  sea.addColorStop(0.06, '#4f97a6')
  sea.addColorStop(0.4, '#226b86')
  sea.addColorStop(1, '#0d3550')
  g.fillStyle = sea
  g.fillRect(0, horizon, W, H - horizon)
  // its waves are those of the game's own sea, at the size of the island; towards the horizon they are lost in the haze
  const water = new WaterPattern(g)
  g.save()
  g.beginPath()
  g.rect(0, horizon, W, H - horizon)
  g.clip()
  g.setTransform(s, 0, 0, s, origin[0], origin[1])
  const waves = { x: -origin[0] / s, y: (horizon - origin[1]) / s, w: W / s, h: (H - horizon) / s }
  g.globalAlpha = 0.5
  water.fill(g, waves, 0, false)
  g.globalAlpha = 0.9
  water.ripple(g, waves, 0)
  g.restore()
  const far = g.createLinearGradient(0, horizon, 0, horizon + (H - horizon) * 0.3)
  far.addColorStop(0, 'rgba(150, 196, 190, 0.96)')
  far.addColorStop(0.3, 'rgba(92, 158, 170, 0.6)')
  far.addColorStop(1, 'rgba(60, 130, 150, 0)')
  g.fillStyle = far
  g.fillRect(0, horizon, W, (H - horizon) * 0.3)
  // under the sun the water glitters: short strokes of light that grow towards the viewer
  for (let i = 0; i < 1500; i++) {
    const depth = hash2(i, 1, 81) ** 1.6
    const y = horizon + depth * (H - horizon)
    const x = sun[0] + (hash2(i, 2, 81) - 0.5) * 2 * W * (0.05 + 0.22 * depth)
    const near = Math.max(0, 1 - Math.abs(x - sun[0]) / (W * (0.05 + 0.22 * depth)))
    g.fillStyle = `rgba(255, ${238 - 30 * depth}, ${200 - 20 * depth}, ${0.5 * near * (1 - depth * 0.6)})`
    g.beginPath()
    g.ellipse(x, y, unit * (2 + 12 * depth) * (0.5 + hash2(i, 3, 81)), unit * (0.4 + 1 * depth), 0, 0, Math.PI * 2)
    g.fill()
  }
  // the island: shallows, surf, beach, meadow and streets, worked out point by point
  const at = (u: number, v: number): [number, number] => [origin[0] + (u - v) * 32 * s, origin[1] + (u + v) * 16 * s]
  paintGround(g, origin, s, flaggedPlots())
  // everything that stands on the island, from the back to the front
  const things: { depth: number; draw: () => void }[] = []
  // the shadows go into a layer of their own and on the ground together: where two overlap it is no darker
  const layer = document.createElement('canvas')
  layer.width = W
  layer.height = H
  const shade = layer.getContext('2d')
  const shades: (() => void)[] = []
  for (const [name, u, v] of TOWN) {
    const made = built(`buildings/${name}`)
    if (!made) continue
    const size = name.startsWith('house_') ? [2, 2] : getBuilding(name).size
    const left = made.pads.l / 4 + size[1] * 32
    const rise = made.image.height / 4 - (size[0] + size[1]) * 16 - made.pads.b / 4
    const [x, y] = at(u, v)
    const cast = made.shadow
    if (cast) shades.push(() => shade?.drawImage(cast.canvas, x - left * s + cast.left * s, y - rise * s + cast.top * s, cast.canvas.width * s, cast.canvas.height * s))
    things.push({ depth: u + v + size[0] + size[1], draw: () => {
      g.drawImage(made.image, x - left * s, y - rise * s, (made.image.width / 4) * s, (made.image.height / 4) * s)
      if (!made.spin) return
      // the sails of the mill are no part of its picture
      g.save()
      g.translate(x - left * s, y - rise * s)
      g.scale(s, s)
      drawSails(g, (made.spin.x * made.image.width) / 4, (made.spin.y * made.image.height) / 4, made.spin.long, sailAngle(0, false))
      g.restore()
    } })
  }
  for (const [kind, variant, u, v, scale] of GREEN) {
    const picture = grown(kind, variant)
    if (!picture) continue
    const [x, y] = at(u, v)
    const [w, h] = [picture.width * grownScale(kind) * s * scale, picture.height * grownScale(kind) * s * scale]
    things.push({ depth: u + v, draw: () => g.drawImage(picture, x - w / 2, y - h, w, h) })
  }
  for (const lay of shades) lay()
  g.globalAlpha = SHADOW_DEPTH
  g.drawImage(layer, 0, 0)
  g.globalAlpha = 1
  things.sort((a, b) => a.depth - b.depth)
  for (const thing of things) thing.draw()
  // the ships, each with its broken picture in the water and a line of foam at its side
  for (const [sector, u, v, scale] of FLEET) {
    const picture = shipPicture(sector)
    if (!picture) continue
    const [x, y] = at(u, v)
    const size = SHIP_SIZE * s * scale
    const [left, top] = [x - size * SHIP_ORIGIN.x, y - size * SHIP_ORIGIN.y]
    g.save()
    g.globalAlpha = 0.22
    g.translate(left, y + size * 0.06)
    g.scale(1, -0.6)
    g.drawImage(picture, 0, -size * SHIP_ORIGIN.y, size, size)
    g.restore()
    g.fillStyle = 'rgba(236, 248, 250, 0.4)'
    g.beginPath()
    g.ellipse(x, y + size * 0.03, size * 0.3, size * 0.035, sector % 4 === 1 ? 0.46 : sector % 4 === 3 ? -0.46 : 0, 0, Math.PI * 2)
    g.fill()
    g.drawImage(picture, left, top, size, size)
  }
  // the evening over all of it: warm from the sun's side, and darker towards the edges, where the menu's eye does not rest
  g.globalCompositeOperation = 'overlay'
  const warm = g.createLinearGradient(W, 0, 0, H)
  warm.addColorStop(0, 'rgba(255, 196, 120, 0.42)')
  warm.addColorStop(0.5, 'rgba(180, 150, 120, 0.2)')
  warm.addColorStop(1, 'rgba(70, 90, 140, 0.36)')
  g.fillStyle = warm
  g.fillRect(0, 0, W, H)
  g.globalCompositeOperation = 'source-over'
  const edge = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.6)
  edge.addColorStop(0, 'rgba(8, 18, 30, 0)')
  edge.addColorStop(1, 'rgba(8, 18, 30, 0.55)')
  g.fillStyle = edge
  g.fillRect(0, 0, W, H)
}
