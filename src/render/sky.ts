// The sky over the island: the warm light of an afternoon sun that stands in the top left, cloud shadows that drift
// across land and sea, and an evening every few minutes, when the light turns blue. The windows that glow then are
// collected in lightLayer.ts.

/** Length of a day in game ticks and the share of it that is evening (with the fades in and out). */
export const DAY_TICKS = 540
const EVENING_FROM = 0.72
const FADE = 0.07

/** How deep the evening is at a game time, 0 by day to 1: it comes softly, stays a while and goes softly. */
export function duskShare(ticks: number): number {
  const time = (((ticks % DAY_TICKS) + DAY_TICKS) % DAY_TICKS) / DAY_TICKS
  if (time < EVENING_FROM) return 0
  const smooth = (t: number): number => t * t * (3 - 2 * t)
  if (time < EVENING_FROM + FADE) return smooth((time - EVENING_FROM) / FADE)
  if (time > 1 - FADE) return smooth((1 - time) / FADE)
  return 1
}

interface Area {
  x: number
  y: number
  w: number
  h: number
}

const CLOUD_RES = 256
/** World pixels one cloud picture covers, and how fast it drifts (world pixels per second). */
const CLOUD_SPAN = 2400
const CLOUD_SPEED = { x: 9, y: 3.5 }
const CLOUD_ALPHA = 0.16

/** A seamless picture of soft dark patches: sums of whole-number waves, cut off so most of the sky stays clear. */
function makeClouds(): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas')
  canvas.width = CLOUD_RES
  canvas.height = CLOUD_RES
  const g = canvas.getContext('2d')
  if (!g) return null
  const waves: [number, number, number, number][] = [
    [1, 0, 1, 0.4], [0, 1, 1, 2.1], [1, 1, 0.9, 4.0], [2, -1, 0.7, 1.3], [1, 2, 0.6, 5.2], [3, 1, 0.35, 0.7], [-2, 3, 0.3, 3.3],
  ]
  const total = waves.reduce((sum, wave) => sum + wave[2], 0)
  const image = g.createImageData(CLOUD_RES, CLOUD_RES)
  for (let y = 0; y < CLOUD_RES; y++) {
    for (let x = 0; x < CLOUD_RES; x++) {
      let value = 0
      for (const [fx, fy, amplitude, phase] of waves) value += amplitude * Math.sin(2 * Math.PI * ((fx * x + fy * y) / CLOUD_RES) + phase)
      const cover = Math.max(0, Math.min(1, (value / total - 0.12) / 0.3))
      const o = (y * CLOUD_RES + x) * 4
      image.data[o] = 12
      image.data[o + 1] = 22
      image.data[o + 2] = 40
      image.data[o + 3] = Math.round(255 * cover * cover * (3 - 2 * cover))
    }
  }
  g.putImageData(image, 0, 0)
  return canvas
}

/**
 * The afternoon: warm light from the top left that cools towards the bottom right. The colours are laid over the
 * picture with the 'overlay' blend: a colour near middle grey leaves dark and light as they are and only shifts the
 * hue, so the picture turns warm without turning hazy. Above middle grey it also brightens, below it darkens.
 */
const AFTERNOON = {
  warm: 'rgba(196, 148, 92, 0.5)',
  middle: 'rgba(160, 136, 108, 0.34)',
  cool: 'rgba(92, 104, 142, 0.42)',
}

export class Sky {
  private clouds: CanvasPattern | null | undefined

  /** The light of the afternoon over the visible area: one fill, nothing is worked out per pixel here. */
  private drawLight(ctx: CanvasRenderingContext2D, area: Area): void {
    ctx.save()
    ctx.globalCompositeOperation = 'overlay'
    const light = ctx.createLinearGradient(area.x, area.y, area.x + area.w, area.y + area.h)
    light.addColorStop(0, AFTERNOON.warm)
    light.addColorStop(0.5, AFTERNOON.middle)
    light.addColorStop(1, AFTERNOON.cool)
    ctx.fillStyle = light
    ctx.fillRect(area.x, area.y, area.w, area.h)
    ctx.restore()
  }

  /** The light of the day and the cloud shadows over the visible area. With `still` the clouds stand where they are (less motion). */
  drawClouds(ctx: CanvasRenderingContext2D, area: Area, now: number, still: boolean): void {
    this.drawLight(ctx, area)
    if (this.clouds === undefined) {
      const picture = makeClouds()
      this.clouds = picture ? ctx.createPattern(picture, 'repeat') : null
    }
    if (!this.clouds) return
    const seconds = still ? 0 : now / 1000
    const scale = CLOUD_SPAN / CLOUD_RES
    const dx = (seconds * CLOUD_SPEED.x) % CLOUD_SPAN
    const dy = (seconds * CLOUD_SPEED.y) % CLOUD_SPAN
    ctx.save()
    ctx.globalAlpha = CLOUD_ALPHA
    ctx.translate(dx, dy)
    ctx.scale(scale, scale)
    ctx.fillStyle = this.clouds
    ctx.fillRect((area.x - dx) / scale, (area.y - dy) / scale, area.w / scale, area.h / scale)
    ctx.restore()
  }

  /** The evening: a blue veil over everything. The lights are added afterwards (see lightLayer.ts). */
  drawDusk(ctx: CanvasRenderingContext2D, area: Area, share: number): void {
    if (share <= 0) return
    ctx.save()
    ctx.globalCompositeOperation = 'multiply'
    const mix = (day: number, night: number): number => Math.round(day + (night - day) * share)
    ctx.fillStyle = `rgb(${mix(255, 126)}, ${mix(255, 140)}, ${mix(255, 202)})`
    ctx.fillRect(area.x, area.y, area.w, area.h)
    ctx.restore()
  }
}
