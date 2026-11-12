// The lights of the evening are collected on their own layer while the buildings are drawn back to front: every
// building first wipes the lights it stands in front of, then adds its own. At the end the layer is added to the
// darkened map, so a window never shines through the house in front of it.
import { getBuilding } from '../data'
import type { PlacedBuilding } from '../sim/state'

/** Lived-in houses are lit, public buildings while they are open, producers while they work. */
export function isLit(building: PlacedBuilding): boolean {
  if (building.house) return !building.house.ruin && building.house.residents > 0
  const working = !building.production || building.production.status.kind === 'producing'
  return building.active && getBuilding(building.type).kind !== 'road' && working
}

let glow: HTMLCanvasElement | null | undefined

/** A round warm glow, drawn once and stamped under every lit building. */
export function glowStamp(): HTMLCanvasElement | null {
  if (glow !== undefined) return glow
  glow = document.createElement('canvas')
  glow.width = 96
  glow.height = 96
  const g = glow.getContext('2d')
  if (!g) return (glow = null)
  const gradient = g.createRadialGradient(48, 48, 2, 48, 48, 48)
  gradient.addColorStop(0, 'rgba(255, 196, 110, 0.5)')
  gradient.addColorStop(0.4, 'rgba(255, 160, 70, 0.22)')
  gradient.addColorStop(1, 'rgba(255, 140, 40, 0)')
  g.fillStyle = gradient
  g.fillRect(0, 0, 96, 96)
  return glow
}

export class LightLayer {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null

  /** Starts an empty layer that is drawn on exactly like the map. */
  begin(main: CanvasRenderingContext2D): void {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas')
      this.ctx = this.canvas.getContext('2d')
    }
    if (!this.ctx) return
    const { width, height } = main.canvas
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width
      this.canvas.height = height
    }
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.ctx.clearRect(0, 0, width, height)
    this.ctx.setTransform(main.getTransform())
  }

  /** Whatever `draw` paints hides the lights behind it. */
  cover(draw: (ctx: CanvasRenderingContext2D) => void): void {
    if (!this.ctx) return
    this.ctx.globalCompositeOperation = 'destination-out'
    draw(this.ctx)
    this.ctx.globalCompositeOperation = 'source-over'
  }

  /** `draw` paints lights. */
  light(draw: (ctx: CanvasRenderingContext2D) => void): void {
    if (this.ctx) draw(this.ctx)
  }

  /** Adds the lights to the map, as strong as the evening is deep (0 to 1). */
  flush(main: CanvasRenderingContext2D, share: number): void {
    if (!this.canvas) return
    main.save()
    main.setTransform(1, 0, 0, 1, 0, 0)
    main.globalCompositeOperation = 'lighter'
    main.globalAlpha = share
    main.drawImage(this.canvas, 0, 0)
    main.restore()
  }
}
