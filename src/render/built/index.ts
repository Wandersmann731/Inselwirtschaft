// Every building picture of the game is made here, by code, the first time it is needed, and kept. A picture is
// asked for by the key it always had ("buildings/bakery", "buildings/house_settlers_3"), so the rest of the renderer
// places and draws it as before.
import { buildings } from '../../data'
import { RES, Scene, type Rendered } from './kit'
import { drawSails, sailAngle } from './sails'
import { house, HOUSE_VARIANTS } from './houses'
import { makerOf } from './catalog'

export type { Rendered } from './kit'

const TIERS = ['pioneers', 'settlers', 'citizens', 'merchants', 'aristocrats', 'ruin']
const defs = new Map(buildings.map((def) => [def.id, def]))

/** "buildings/weaver_2" is the second variant of the weaver. */
function parse(key: string): { name: string; variant: number } | null {
  const match = /^buildings\/(.+?)(?:_(\d+))?$/.exec(key)
  return match ? { name: match[1], variant: match[2] ? Number(match[2]) - 1 : 0 } : null
}

/** How many variants a building has. */
function variantsOf(name: string): number {
  if (name.startsWith('house_')) return TIERS.includes(name.slice(6)) ? HOUSE_VARIANTS : 0
  return defs.has(name) ? (makerOf(name)?.variants ?? 0) : 0
}

/** The keys of all variants of a building, e.g. of "buildings/house_settlers". Empty for something that is not built by code. */
export function builtVariants(base: string): string[] {
  const parsed = parse(base)
  if (!parsed) return []
  const count = variantsOf(parsed.name)
  return Array.from({ length: count }, (_, i) => (i === 0 ? base : `${base}_${i + 1}`))
}

const cache = new Map<string, Rendered | null>()
/** The pictures that are kept right now, by their names. */
export function builtKept(): string[] {
  return [...cache.keys()]
}

/** Lets go of pictures: they are made again when they are next asked for. */
export function forgetBuilt(ids: string[]): void {
  for (const id of ids) cache.delete(id)
}

/** Milliseconds that may still be spent on making pictures in this frame. */
let budget = Infinity
/** Counts the frames; a picture remembers in which it was last asked for. */
let frame = 0
const used = new Map<string, number>()

/** Called once per frame: pictures that are missing are made a few at a time, so the game never stalls. */
export function allowBuilding(milliseconds: number): void {
  budget = milliseconds
  frame++
}

/** Bytes of picture memory all building pictures together may take on a phone, and how long one is surely kept (frames). */
export const PICTURE_BUDGET = { bytes: 72e6, spare: 180 }

/** Bytes a building picture holds: itself, its lit windows, its shadow. */
function bytesOf(made: Rendered | null): number {
  if (!made) return 0
  const size = (canvas: HTMLCanvasElement | null | undefined): number => (canvas ? canvas.width * canvas.height * 4 : 0)
  return size(made.image) + size(made.glow) + size(made.shadow?.canvas)
}

/**
 * Which pictures to let go so that all together stay within `limit` bytes: those asked for longest ago first, and
 * never one that was asked for within the last `spare` frames (it stands on screen). Pure.
 */
export function picturesToDrop(kept: { id: string; bytes: number; used: number }[], limit: number, now: number, spare: number): string[] {
  let total = kept.reduce((sum, picture) => sum + picture.bytes, 0)
  const drop: string[] = []
  for (const picture of [...kept].sort((a, b) => a.used - b.used)) {
    if (total <= limit || now - picture.used < spare) break
    total -= picture.bytes
    drop.push(picture.id)
  }
  return drop
}

/**
 * The picture of a building with its shadow and its lit windows, or null if it is not made by code (or not made
 * yet in this frame: then it comes in one of the next). `turned` is for a building that is not square and stands
 * the other way round: it is built that way, not mirrored, so the sun stays on its left.
 */
export function built(key: string, turned = false): Rendered | null {
  const id = turned ? `${key}|t` : key
  const hit = cache.get(id)
  if (hit !== undefined) {
    if (hit) used.set(id, frame)
    return hit
  }
  if (typeof document === 'undefined') return null
  const parsed = parse(key)
  if (!parsed || variantsOf(parsed.name) === 0) {
    cache.set(id, null)
    return null
  }
  if (budget <= 0) return null
  const started = performance.now()
  const { name, variant } = parsed
  let made: Rendered | null = null
  if (name.startsWith('house_')) {
    const scene = new Scene(2, 2, variant * 31 + name.length)
    house(scene, name.slice(6), variant)
    made = scene.render()
  } else {
    const def = defs.get(name)!
    const [w, h] = turned ? [def.size[1], def.size[0]] : def.size
    const scene = new Scene(w, h, variant * 31 + name.length * 7)
    makerOf(name)!.make(scene, variant, def)
    made = scene.render()
  }
  budget -= performance.now() - started
  cache.set(id, made)
  used.set(id, frame)
  // a town that has shown every kind of building does not keep them all: those not seen for longest go first
  const kept = [...cache].filter(([, picture]) => picture).map(([name, picture]) => ({ id: name, bytes: bytesOf(picture), used: used.get(name) ?? 0 }))
  for (const name of picturesToDrop(kept, PICTURE_BUDGET.bytes, frame, PICTURE_BUDGET.spare)) {
    cache.delete(name)
    used.delete(name)
  }
  return made
}

const thumbs = new Map<string, string>()

/** A small picture of a building for menus, as an address an <img> can show. Empty if it cannot be made. */
export function thumbOf(key: string, size = 144): string {
  const hit = thumbs.get(key)
  if (hit !== undefined) return hit
  const spare = budget
  const kept = cache.has(key)
  budget = Infinity
  const made = built(key)
  budget = spare
  // a menu shows every building of the game: only the small pictures are kept, not the large ones
  if (!kept) cache.delete(key)
  let url = ''
  if (made) {
    const scale = Math.min(size / made.image.width, size / made.image.height)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(made.image.width * scale))
    canvas.height = Math.max(1, Math.round(made.image.height * scale))
    const t = canvas.getContext('2d')
    if (t) {
      t.drawImage(made.image, 0, 0, canvas.width, canvas.height)
      // a mill is shown with its sails, standing still
      if (made.spin) {
        t.scale(scale * RES, scale * RES)
        drawSails(t, (made.spin.x * made.image.width) / RES, (made.spin.y * made.image.height) / RES, made.spin.long, sailAngle(0, false))
      }
    }
    url = canvas.toDataURL('image/png')
  }
  thumbs.set(key, url)
  return url
}
