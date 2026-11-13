// The hints over the buildings: a softly glowing point where something is wrong, or a small disc with the picture
// of the good that is missing. They are no part of the painted map: each is an element of the page that floats over
// the canvas, round and lit by CSS (theme.css, .map-mark), so it stays sharp and readable at every zoom and costs
// the canvas nothing. Per frame only the places that changed are written.
import { iconUrl } from './icons'

/** A hint at a place of the world: the colour of the problem and, if a good is missing, which. */
export interface Mark {
  id: number
  x: number
  y: number
  colour: string
  good?: string
}

/** A colour given as #rrggbb, as CSS with `alpha`, and `pale` of the way to white (0 leaves it). Pure. */
export function glowOf(hex: string, alpha: number, pale = 0): string {
  const value = parseInt(hex.slice(1), 16)
  const part = (shift: number): number => Math.round(((value >> shift) & 255) + (255 - ((value >> shift) & 255)) * pale)
  return `rgba(${part(16)}, ${part(8)}, ${part(0)}, ${alpha})`
}

/**
 * How large a hint shows on screen, in CSS pixels: it grows with the zoom, but never gets too small to see on a
 * phone or too large for the house it hangs over. Pure.
 */
export function markSize(zoom: number, badge: boolean): number {
  const size = (badge ? 24 : 18) * zoom
  return Math.round(Math.max(badge ? 24 : 14, Math.min(badge ? 40 : 30, size)))
}

interface Shown {
  element: HTMLElement
  at: string
  look: string
}

export class MarkLayer {
  private readonly root: HTMLElement
  private readonly shown = new Map<number, Shown>()
  private sizes = ''
  private calm: boolean | null = null

  constructor(root: HTMLElement) {
    this.root = root
  }

  /** Shows these hints and no others. `toScreen` turns a place of the world into CSS pixels of the screen. */
  show(marks: Mark[], toScreen: (x: number, y: number) => [number, number], zoom: number, calm: boolean): void {
    const sizes = `${markSize(zoom, false)}|${markSize(zoom, true)}`
    if (sizes !== this.sizes) {
      this.sizes = sizes
      this.root.style.setProperty('--dot', `${markSize(zoom, false)}px`)
      this.root.style.setProperty('--badge', `${markSize(zoom, true)}px`)
    }
    if (calm !== this.calm) {
      this.calm = calm
      this.root.classList.toggle('calm', calm)
    }
    const seen = new Set<number>()
    for (const mark of marks) {
      seen.add(mark.id)
      let item = this.shown.get(mark.id)
      if (!item) {
        item = { element: document.createElement('div'), at: '', look: '' }
        this.root.appendChild(item.element)
        this.shown.set(mark.id, item)
      }
      const look = `${mark.colour}|${mark.good ?? ''}`
      if (look !== item.look) {
        item.look = look
        item.element.className = mark.good ? 'map-mark need' : 'map-mark'
        item.element.style.setProperty('--mark', mark.colour)
        item.element.style.setProperty('--glow', glowOf(mark.colour, 0.6))
        item.element.style.setProperty('--pale', glowOf(mark.colour, 1, 0.5))
        const picture = mark.good ? iconUrl(`goods/${mark.good}`) : ''
        item.element.style.backgroundImage = picture ? `url(${picture})` : ''
      }
      const [x, y] = toScreen(mark.x, mark.y)
      const at = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
      if (at !== item.at) {
        item.at = at
        item.element.style.transform = at
      }
    }
    for (const [id, item] of this.shown) {
      if (seen.has(id)) continue
      item.element.remove()
      this.shown.delete(id)
    }
  }

  clear(): void {
    for (const item of this.shown.values()) item.element.remove()
    this.shown.clear()
  }
}
