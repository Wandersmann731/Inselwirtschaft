// Finds the windows painted into a building picture, so they can glow in the evening. A window pane is a small,
// compact dark patch (glass in the shade, bluish or brown) set into a lighter wall or frame; fire and lamp light
// already painted in (a forge, a lit window) is a small bright warm patch with something darker around it. Thin
// outlines and timber beams are taken away first, so they do not join the panes; roofs, shadows and fields are
// ruled out by size, shape and what surrounds them.
import { HALF_H, HALF_W } from './iso'
import type { SpriteImage } from './sprites'

export interface Pane {
  x: number
  y: number
  w: number
  h: number
  area: number
  /** True for light that is already painted in (fire, a lit window). */
  warm: boolean
}

const MIN_AREA = 16
/** Smallest pane in picture pixels (pictures are drawn at half size). */
const MIN_W = 4
const MIN_H = 5
const MAX_AREA = 300
const MAX_W = 18
const MAX_H = 28
/** A pane fills at least this share of its bounding box. */
const MIN_FILL = 0.62
/** Glass is darker than this (0 to 255); the wall around it is lighter by at least RING_LIGHTER. */
const GLASS_DARK = 66
/** Bluish glass may be lighter than that. */
const BLUE_GLASS_DARK = 108
const RING_LIGHTER = 30
/** At most this share of the ring around a pane may be as dark as the pane (then it is a roof or a shadow). */
const MAX_RING_DARK = 0.25

const lum = (r: number, g: number, b: number): number => 0.3 * r + 0.59 * g + 0.11 * b

/** Glass in the shade: very dark and not green (leaves and moss are dark too), or dark and clearly bluish. */
function isGlass(r: number, g: number, b: number): boolean {
  const l = lum(r, g, b)
  if (l < GLASS_DARK) return !(g > r + 6 && g > b + 6)
  return l < BLUE_GLASS_DARK && b >= r + 10 && b >= g - 6
}

/** Bright, warm, saturated: fire or lamp light. */
function isFlame(r: number, g: number, b: number): boolean {
  return r > 228 && g > 150 && g < 232 && b < 120 && r - b > 120
}

/**
 * The window panes and painted lights of a picture, from its RGBA pixels. Pure, so it can be tested.
 * `mask` holds 1 for glass and 2 for warm light at every pixel that belongs to a pane. `accept` is asked with the
 * middle of the lower edge of every pane and can turn it down (a dark spot in the garden is no window).
 */
export function findPanes(data: Uint8ClampedArray, width: number, height: number, accept: (x: number, y: number) => boolean = () => true): { panes: Pane[]; mask: Uint8Array } {
  const size = width * height
  const raw = new Uint8Array(size)
  for (let i = 0; i < size; i++) {
    const o = i * 4
    if (data[o + 3] < 200) continue
    if (isGlass(data[o], data[o + 1], data[o + 2])) raw[i] = 1
    else if (isFlame(data[o], data[o + 1], data[o + 2])) raw[i] = 2
  }
  // glazing bars split a window into panes: gaps of one or two pixels between glass are closed first
  const joined = new Uint8Array(raw)
  const glass = (i: number): boolean => raw[i] === 1
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      const i = y * width + x
      if (raw[i] !== 0 || data[i * 4 + 3] < 200) continue
      const across = (glass(i - 1) && (glass(i + 1) || glass(i + 2))) || (glass(i - 2) && glass(i + 1))
      const down = (glass(i - width) && (glass(i + width) || glass(i + 2 * width))) || (glass(i - 2 * width) && glass(i + width))
      if (across || down) joined[i] = 1
    }
  }
  // thin dark lines (outlines, beams) go: a glass pixel stays only with glass on all four sides
  const kind = new Uint8Array(size)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x
      if (raw[i] === 2) kind[i] = 2
      else if (joined[i] === 1 && joined[i - 1] === 1 && joined[i + 1] === 1 && joined[i - width] === 1 && joined[i + width] === 1) kind[i] = 1
    }
  }
  const mask = new Uint8Array(size)
  const seen = new Uint8Array(size)
  const panes: Pane[] = []
  const stack: number[] = []
  for (let start = 0; start < size; start++) {
    if (kind[start] === 0 || seen[start]) continue
    const type = kind[start]
    const members: number[] = []
    let minX = width
    let maxX = 0
    let minY = height
    let maxY = 0
    stack.push(start)
    seen[start] = 1
    while (stack.length > 0) {
      const i = stack.pop()!
      members.push(i)
      const x = i % width
      const y = (i - x) / width
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
      for (const n of [i - 1, i + 1, i - width, i + width]) {
        if (n < 0 || n >= size || seen[n] || kind[n] !== type) continue
        seen[n] = 1
        stack.push(n)
      }
    }
    // the core of a glass pane lost one pixel on every side: its real size is two more each way
    const grow = type === 1 ? 1 : 0
    const w = maxX - minX + 1 + 2 * grow
    const h = maxY - minY + 1 + 2 * grow
    const core = (maxX - minX + 1) * (maxY - minY + 1)
    if (w < MIN_W || h < MIN_H || w * h < MIN_AREA || w * h > MAX_AREA || w > MAX_W || h > MAX_H || members.length / core < MIN_FILL) continue
    // windows stand upright or are square, never a flat strip (that is the shadow under a roof)
    if (h < w * 0.7) continue
    const box = { minX: minX - grow, maxX: maxX + grow, minY: minY - grow, maxY: maxY + grow }
    if (!accept((box.minX + box.maxX + 1) / 2, box.maxY + 1) || !ringFits(data, raw, width, height, box, members, type)) continue
    let area = 0
    for (let y = box.minY; y <= box.maxY; y++) {
      for (let x = box.minX; x <= box.maxX; x++) {
        const i = y * width + x
        if ((type === 1 ? joined[i] : raw[i]) !== type) continue
        mask[i] = type
        area++
      }
    }
    panes.push({ x: box.minX, y: box.minY, w, h, area, warm: type === 2 })
  }
  return { panes, mask }
}

/** Looks at the two-pixel ring around a patch: a pane sits in a lighter wall, a flame in something darker. */
function ringFits(data: Uint8ClampedArray, raw: Uint8Array, width: number, height: number, box: { minX: number; maxX: number; minY: number; maxY: number }, members: number[], type: number): boolean {
  let own = 0
  for (const i of members) own += lum(data[i * 4], data[i * 4 + 1], data[i * 4 + 2])
  own /= members.length
  let count = 0
  let same = 0
  let open = 0
  let light = 0
  for (let y = box.minY - 3; y <= box.maxY + 3; y++) {
    for (let x = box.minX - 3; x <= box.maxX + 3; x++) {
      if (x >= box.minX && x <= box.maxX && y >= box.minY && y <= box.maxY) continue
      count++
      if (x < 0 || y < 0 || x >= width || y >= height || data[(y * width + x) * 4 + 3] < 200) {
        open++
        continue
      }
      const i = y * width + x
      if (raw[i] === type) same++
      light += lum(data[i * 4], data[i * 4 + 1], data[i * 4 + 2])
    }
  }
  const painted = count - open
  // at the rim of the picture: not set into a wall
  if (painted < count * 0.92) return false
  const around = light / painted
  if (type === 1) return same / painted <= MAX_RING_DARK && around > own + RING_LIGHTER
  return around < own - 45
}

/** Where the footprint of the building lies in its picture (see coastFade.ts), to tell walls from the garden. */
export interface PaneFrame {
  originX: number
  originY: number
  scale: number
  w: number
  h: number
  mirrored: boolean
}

/** How far towards the front edges of the plot a window can sit, as a share of the footprint. */
const FRONT_LIMIT = 0.84
/** How far down the plot a window can sit (0 back corner, 1 front corner): the shed of a farm stands at the back. */
const DEPTH_LIMIT = { building: 0.78, farm: 0.5 }

/** True if a pane with its lower edge at picture pixel (x, y) can be a window: not in the garden or out in the field. */
export function onBuilding(x: number, y: number, frame: PaneFrame, imageWidth: number, farm: boolean): boolean {
  const sx = frame.mirrored ? imageWidth - x : x
  const a = (sx - frame.originX) / frame.scale / HALF_W
  const b = (y - frame.originY) / frame.scale / HALF_H
  const u = (a + b) / 2
  const v = (b - a) / 2
  if (u > frame.w * FRONT_LIMIT || v > frame.h * FRONT_LIMIT) return false
  return (u + v) / (frame.w + frame.h) <= (farm ? DEPTH_LIMIT.farm : DEPTH_LIMIT.building)
}

/** Half the width and the height of the shed of a farm, in picture pixels, measured from the tip of its roof. */
const SHED = { half: 44, height: 90 }

/**
 * On a farm only the shed has windows: crops stand tall and dark all over the plot. The shed is the highest thing
 * in the picture, so panes count only close below the topmost painted pixel. Returns that test for a picture.
 */
export function shedZone(data: Uint8ClampedArray, width: number, height: number): (x: number, y: number) => boolean {
  for (let y = 0; y < height; y++) {
    let sum = 0
    let count = 0
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] < 200) continue
      sum += x
      count++
    }
    if (count === 0) continue
    const tip = sum / count
    return (x, bottom) => Math.abs(x - tip) <= SHED.half && bottom - y <= SHED.height
  }
  return () => false
}

const masks = new Map<string, HTMLCanvasElement | null>()
const MAX_MASKS = 160

/**
 * The lights of a building picture as a picture of the same shape: every pane filled with warm light and a soft
 * glow around it. Null if the picture has no windows. Made once per picture.
 */
export function windowMask(key: string, image: SpriteImage, frame: PaneFrame, farm: boolean): HTMLCanvasElement | null {
  const id = `${key}|${image.width}x${image.height}|${frame.mirrored ? 'm' : ''}`
  const hit = masks.get(id)
  if (hit !== undefined) return hit
  // The search works in pictures with two pixels per world pixel; a sharper picture is looked at in a small copy.
  const shrink = 2 / frame.scale
  const small: PaneFrame = { ...frame, originX: frame.originX * shrink, originY: frame.originY * shrink, scale: 2 }
  const source = document.createElement('canvas')
  source.width = Math.round(image.width * shrink)
  source.height = Math.round(image.height * shrink)
  const read = source.getContext('2d', { willReadFrequently: true })
  let result: HTMLCanvasElement | null = null
  if (read) {
    read.imageSmoothingQuality = 'high'
    read.drawImage(image, 0, 0, source.width, source.height)
    const data = read.getImageData(0, 0, source.width, source.height).data
    const inShed = farm ? shedZone(data, source.width, source.height) : () => true
    const { panes, mask } = findPanes(data, source.width, source.height, (x, y) => inShed(x, y) && onBuilding(x, y, small, source.width, farm))
    if (panes.length > 0) {
      result = document.createElement('canvas')
      result.width = source.width
      result.height = source.height
      const g = result.getContext('2d')
      if (g) {
        for (const pane of panes) {
          const cx = pane.x + pane.w / 2
          const cy = pane.y + pane.h / 2
          const radius = 5 + 1.6 * Math.max(pane.w, pane.h)
          const glow = g.createRadialGradient(cx, cy, 0, cx, cy, radius)
          glow.addColorStop(0, `rgba(255, 190, 90, ${pane.warm ? 0.5 : 0.34})`)
          glow.addColorStop(1, 'rgba(255, 150, 50, 0)')
          g.fillStyle = glow
          g.fillRect(cx - radius, cy - radius, 2 * radius, 2 * radius)
        }
        const lit = g.createImageData(result.width, result.height)
        for (let i = 0; i < mask.length; i++) {
          if (mask[i] === 0) continue
          lit.data[i * 4] = 255
          lit.data[i * 4 + 1] = mask[i] === 2 ? 225 : 214
          lit.data[i * 4 + 2] = mask[i] === 2 ? 150 : 132
          lit.data[i * 4 + 3] = 255
        }
        // the panes go on top of the glows: put them through a second canvas, putImageData would wipe the glows
        const panesCanvas = document.createElement('canvas')
        panesCanvas.width = result.width
        panesCanvas.height = result.height
        panesCanvas.getContext('2d')?.putImageData(lit, 0, 0)
        g.drawImage(panesCanvas, 0, 0)
      }
    }
  }
  if (masks.size >= MAX_MASKS) masks.clear()
  masks.set(id, result)
  return result
}
