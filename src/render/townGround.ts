// The ground of a town. Around the houses of citizens, merchants and aristocrats the earth is not left bare: a house
// stands on stone flags or in a garden (which of the two follows from its plan, see built/plots.ts), and the lanes
// between two such houses are paved from wall to wall. Here it is worked out which tile is what, and the flags are
// laid into the picture of a rectangle of ground, slab by slab.
import { getBuilding } from '../data'
import { buildingRect } from '../sim/coverage'
import type { IslandState } from '../sim/state'
import { tierIndex } from '../sim/tiers'
import { hash2, valueNoise } from '../world/noise2d'
import { Terrain } from '../world/terrain'
import { HOUSE_VARIANTS } from './built/look'
import { plotOf } from './built/plots'
import { FLAG_TEX, FLAG_TILES, flagTextures } from './flagstones'
import { pickVariant } from './spriteKeys'

export interface TownGround {
  /** How much of each tile is paved with flags, 0 to 1 (the tile centres are the sample points). */
  paved: Float32Array
  /** 1 on the tiles of a garden plot: grass grows there instead of trodden earth. */
  lawn: Uint8Array
  /** One number per tile that changes when its paving or its garden does: for the pictures that depend on it. */
  code: Uint8Array
}

/** Houses from this tier on stand on flags or in a garden. */
const TOWN_FROM = tierIndex('citizens')
/** A free tile beside a single paved plot is paved this much: the flags end somewhere on it, not at a ruled line. */
const APRON = { least: 0.3, spread: 0.35 }
/** How far the edge of the paving is moved from slab to slab, in shares of the paving. */
const RAGGED = 0.3

type Town = Pick<IslandState, 'map' | 'buildings' | 'occupancy'>

/** Changes when a house comes, goes, falls to ruin or rises a tier, or a public building comes or goes. */
function townSignature(state: Town): number {
  let hash = 0
  for (const building of state.buildings) {
    if (building.house) hash = (Math.imul(hash, 31) + building.id * 8 + tierIndex(building.house.tier) + (building.house.ruin ? 7 : 0)) | 0
    else if (getBuilding(building.type).category === 'public') hash = (Math.imul(hash, 31) + building.id * 8 + 6) | 0
  }
  return hash
}

let kept: { occupancy: number[]; signature: number; ground: TownGround | null } | null = null

/**
 * The paving and the gardens of an island, or null if no house of a town stands on it. A plot of flags is paved, a
 * garden plot is lawn. A free tile between two buildings of the town (houses of citizens and above, public
 * buildings) is a lane and paved; beside one paved plot only, the flags reach a part of the way. Worked out again
 * only when the houses change.
 */
export function townGround(state: Town): TownGround | null {
  const signature = townSignature(state)
  if (kept && kept.occupancy === state.occupancy && kept.signature === signature) return kept.ground
  const { width, height, tiles } = state.map
  // for every tile: the town building that stands on it (0 none), and whether that is a plot of flags
  const owner = new Int32Array(width * height)
  const flags = new Uint8Array(width * height)
  const lawn = new Uint8Array(width * height)
  let any = false
  for (const building of state.buildings) {
    const house = building.house
    const town = house ? !house.ruin && tierIndex(house.tier) >= TOWN_FROM : getBuilding(building.type).category === 'public'
    if (!town) continue
    const plot = house ? plotOf(house.tier, pickVariant(HOUSE_VARIANTS, building.x, building.y)) : null
    if (house) any = true
    const rect = buildingRect(building)
    for (let y = rect.y; y < rect.y + rect.h; y++) {
      for (let x = rect.x; x < rect.x + rect.w; x++) {
        if (x < 0 || y < 0 || x >= width || y >= height) continue
        owner[y * width + x] = building.id
        if (plot?.ground === 'flags') flags[y * width + x] = 1
        if (plot?.ground === 'garden') lawn[y * width + x] = 1
      }
    }
  }
  let ground: TownGround | null = null
  if (any) {
    const paved = new Float32Array(width * height)
    const code = new Uint8Array(width * height)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x
        if (flags[index]) paved[index] = 1
        else if (owner[index] === 0 && tiles[index] !== Terrain.Water) {
          // who stands around this tile: two of the town make it a lane, one paved plot gives it an apron
          let first = 0
          let lane = false
          let apron = false
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const [nx, ny] = [x + dx, y + dy]
              if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
              const there = owner[ny * width + nx]
              if (there === 0) continue
              if (flags[ny * width + nx]) apron = true
              if (first === 0) first = there
              else if (there !== first) lane = true
            }
          }
          if (lane) paved[index] = 1
          else if (apron) paved[index] = APRON.least + APRON.spread * hash2(x, y, 9211)
        }
        code[index] = Math.round(paved[index] * 3) + (lawn[index] ? 4 : 0)
      }
    }
    ground = { paved, lawn, code }
  }
  kept = { occupancy: state.occupancy, signature, ground }
  return ground
}

/** How much a place between the tile centres is paved, 0 to 1. Pure. */
export function pavedAt(paved: Float32Array, width: number, height: number, u: number, v: number): number {
  const fx = u - 0.5
  const fy = v - 0.5
  const x0 = Math.floor(fx)
  const y0 = Math.floor(fy)
  const tx = fx - x0
  const ty = fy - y0
  const at = (x: number, y: number): number => (x < 0 || y < 0 || x >= width || y >= height ? 0 : paved[y * width + x])
  return (at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx) * (1 - ty) + (at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx) * ty
}

/**
 * Whether a slab is laid: decided once for the whole slab, where its middle lies, and every slab has its own idea
 * of where the paving ends (`pick`, 0 to 1). So flags end in whole slabs, some further out than others. Pure.
 */
export function slabLaid(pavedAtMiddle: number, pick: number): boolean {
  return pavedAtMiddle + (pick - 0.5) * RAGGED > 0.5
}

let scratch: HTMLCanvasElement | null = null

/**
 * Lays the flags into the picture of a rectangle of ground that begins at world pixel (x0, y0) and has `scale`
 * picture pixels per world pixel: at the full sharpness of the picture, and only where there is ground under them.
 * Between the slabs the ground shows through.
 */
export function layFlags(out: CanvasRenderingContext2D, town: TownGround, map: { width: number; height: number }, x0: number, y0: number, scale: number, seed: number): void {
  const { width, height } = out.canvas
  scratch ??= document.createElement('canvas')
  if (scratch.width !== width || scratch.height !== height) {
    scratch.width = width
    scratch.height = height
  }
  const g = scratch.getContext('2d')
  if (!g) return
  const image = g.createImageData(width, height)
  const data = image.data
  const tex = flagTextures()
  let laid = false
  for (let py = 0; py < height; py++) {
    const wy = y0 + (py + 0.5) / scale
    for (let px = 0; px < width; px++) {
      const wx = x0 + (px + 0.5) / scale
      const u = (wy / 16 + wx / 32) / 2
      const v = (wy / 16 - wx / 32) / 2
      if (pavedAt(town.paved, map.width, map.height, u, v) < 0.5 - RAGGED) continue
      const tu = Math.floor((((u / FLAG_TILES) % 1) + 1) % 1 * FLAG_TEX)
      const tv = Math.floor((((v / FLAG_TILES) % 1) + 1) % 1 * FLAG_TEX)
      const texel = tv * FLAG_TEX + tu
      if (!slabLaid(pavedAt(town.paved, map.width, map.height, u + tex.du[texel], v + tex.dv[texel]), tex.pick[texel] / 255)) continue
      // stone that lies in the open is not of one colour: damp here, bleached there
      const slow = 0.9 + 0.2 * valueNoise(u * 0.8, v * 0.8, seed + 821)
      const o = (py * width + px) * 4
      data[o] = tex.colour[texel * 3] * slow
      data[o + 1] = tex.colour[texel * 3 + 1] * slow
      data[o + 2] = tex.colour[texel * 3 + 2] * slow
      data[o + 3] = 255 * (0.4 + 0.6 * (tex.body[texel] / 255))
      laid = true
    }
  }
  if (!laid) return
  g.putImageData(image, 0, 0)
  out.save()
  out.setTransform(1, 0, 0, 1, 0, 0)
  out.globalCompositeOperation = 'source-atop'
  out.drawImage(scratch, 0, 0)
  out.restore()
}
