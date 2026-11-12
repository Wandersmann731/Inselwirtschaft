// The sky over the island: cloud shadows that drift across land and sea, and an evening every few minutes, when
// the light turns blue and the windows of lived-in houses and busy workshops glow.
import { getBuilding } from '../data'
import { buildingRect } from '../sim/coverage'
import type { IslandState } from '../sim/state'
import type { TileRange } from './buildingRenderer'
import { tileToWorld } from './iso'

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

/** A round warm glow, drawn once and stamped on every lit building. */
function makeGlow(): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas')
  canvas.width = 96
  canvas.height = 96
  const g = canvas.getContext('2d')
  if (!g) return null
  const gradient = g.createRadialGradient(48, 48, 2, 48, 48, 48)
  gradient.addColorStop(0, 'rgba(255, 214, 130, 0.85)')
  gradient.addColorStop(0.35, 'rgba(255, 170, 70, 0.4)')
  gradient.addColorStop(1, 'rgba(255, 140, 40, 0)')
  g.fillStyle = gradient
  g.fillRect(0, 0, 96, 96)
  return canvas
}

export class Sky {
  private clouds: CanvasPattern | null | undefined
  private glow: HTMLCanvasElement | null | undefined

  /** Cloud shadows over the visible area. With `still` they stand where they are (less motion). */
  drawClouds(ctx: CanvasRenderingContext2D, area: Area, now: number, still: boolean): void {
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

  /** The evening: a blue veil over everything, then warm light at the houses people live in and at running workshops. */
  drawDusk(ctx: CanvasRenderingContext2D, state: IslandState, range: TileRange, area: Area, share: number): void {
    if (share <= 0) return
    ctx.save()
    ctx.globalCompositeOperation = 'multiply'
    const mix = (day: number, night: number): number => Math.round(day + (night - day) * share)
    ctx.fillStyle = `rgb(${mix(255, 126)}, ${mix(255, 140)}, ${mix(255, 202)})`
    ctx.fillRect(area.x, area.y, area.w, area.h)
    ctx.restore()

    if (this.glow === undefined) this.glow = makeGlow()
    if (!this.glow) return
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (const building of state.buildings) {
      const rect = buildingRect(building)
      if (rect.x > range.maxI + 3 || rect.x + rect.w < range.minI - 3 || rect.y > range.maxJ + 3 || rect.y + rect.h < range.minJ - 3) continue
      const def = getBuilding(building.type)
      const working = !building.production || building.production.status.kind === 'producing'
      const lit = building.house ? !building.house.ruin && building.house.residents > 0 : building.active && def.kind !== 'road' && working
      if (!lit) continue
      const centre = tileToWorld(rect.x + rect.w / 2, rect.y + rect.h / 2)
      const size = 46 + 14 * Math.max(rect.w, rect.h)
      // the light sits where the windows are: a little above the ground, in front of the middle of the house
      ctx.globalAlpha = 0.75 * share
      ctx.drawImage(this.glow, centre.x - size / 2, centre.y - 14 - size / 2, size, size)
      // two bright windows on the front walls
      ctx.globalAlpha = share
      ctx.fillStyle = 'rgba(255, 226, 150, 0.9)'
      const spread = 5 + 3 * Math.min(rect.w, rect.h)
      ctx.fillRect(centre.x - spread - 1.5, centre.y - 9, 3, 3.5)
      ctx.fillRect(centre.x + spread - 1.5, centre.y - 9, 3, 3.5)
    }
    ctx.restore()
  }
}
