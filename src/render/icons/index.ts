// Every symbol of the game by its name ("goods/wood", "ui/coin", "tiers/settlers"), drawn by code the first time it
// is needed and kept: as a small canvas for the map, and as an address an <img> can show for the interface.
import { MADE } from './goodsMade'
import { RAW } from './goodsRaw'
import { UNITS, type Draw } from './kit'
import { PEOPLE } from './people'
import { UI } from './ui'
import { hash2 } from '../../world/noise2d'

const GROUPS: Record<string, Record<string, Draw>> = { goods: { ...RAW, ...MADE }, tiers: PEOPLE, ui: UI }

/** The names of all symbols there are. */
export function iconNames(): string[] {
  return Object.entries(GROUPS).flatMap(([group, draws]) => Object.keys(draws).map((name) => `${group}/${name}`))
}

/**
 * The last touches on a drawn symbol, `size` pixels wide: light along the upper left edge of the whole thing and
 * shade along its lower right, as on anything that has a body; and a fine grain, because nothing real is evenly
 * coloured.
 */
function finish(layer: HTMLCanvasElement, paint: CanvasRenderingContext2D, size: number): void {
  const rim = (shift: number, colour: string): HTMLCanvasElement | null => {
    const edge = document.createElement('canvas')
    edge.width = edge.height = size
    const e = edge.getContext('2d')
    if (!e) return null
    e.drawImage(layer, 0, 0)
    e.globalCompositeOperation = 'destination-out'
    e.drawImage(layer, shift, shift)
    e.globalCompositeOperation = 'source-in'
    e.fillStyle = colour
    e.fillRect(0, 0, size, size)
    return edge
  }
  const rims = [rim(size * 0.02, 'rgba(255, 248, 226, 0.42)'), rim(-size * 0.026, 'rgba(22, 20, 44, 0.4)')]
  paint.setTransform(1, 0, 0, 1, 0, 0)
  paint.globalCompositeOperation = 'source-atop'
  for (const edge of rims) if (edge) paint.drawImage(edge, 0, 0)
  if (size >= 64) {
    const image = paint.getImageData(0, 0, size, size)
    for (let i = 0; i < size * size; i++) {
      if (image.data[i * 4 + 3] === 0) continue
      const fleck = 0.95 + 0.1 * hash2(i % size, Math.floor(i / size), 733)
      for (let c = 0; c < 3; c++) image.data[i * 4 + c] *= fleck
    }
    paint.putImageData(image, 0, 0)
  }
  paint.globalCompositeOperation = 'source-over'
}

const canvases = new Map<string, HTMLCanvasElement | null>()
const urls = new Map<string, string>()

/** A symbol as a picture `size` pixels wide, or null if there is none of that name (or no canvas). */
export function iconCanvas(name: string, size = 96): HTMLCanvasElement | null {
  const id = `${name}@${size}`
  const hit = canvases.get(id)
  if (hit !== undefined) return hit
  const [group, key] = name.split('/')
  const draw = GROUPS[group]?.[key]
  if (!draw || typeof document === 'undefined') return null
  const layer = document.createElement('canvas')
  const canvas = document.createElement('canvas')
  layer.width = layer.height = canvas.width = canvas.height = size
  const paint = layer.getContext('2d')
  const g = canvas.getContext('2d')
  if (paint && g) {
    // drawn a little smaller than the square, so its shade has room
    paint.translate(size * 0.04, size * 0.03)
    paint.scale((size * 0.92) / UNITS, (size * 0.92) / UNITS)
    draw(paint)
    finish(layer, paint, size)
    // no outline: a soft shade behind the whole symbol sets it off from whatever lies under it
    g.shadowColor = 'rgba(18, 14, 10, 0.6)'
    g.shadowBlur = size * 0.05
    g.shadowOffsetY = size * 0.022
    g.drawImage(layer, 0, 0)
  }
  canvases.set(id, g ? canvas : null)
  return g ? canvas : null
}

/** A symbol as an address for an <img>. Empty if there is none of that name. */
export function iconUrl(name: string): string {
  const hit = urls.get(name)
  if (hit !== undefined) return hit
  const url = iconCanvas(name, 128)?.toDataURL('image/png') ?? ''
  urls.set(name, url)
  return url
}
