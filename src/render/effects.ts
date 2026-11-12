import { getBuilding } from '../data'
import { reducedMotion } from '../save/motion'
import { buildingRect } from '../sim/coverage'
import type { IslandState, PlacedBuilding } from '../sim/state'
import { getTier, tierIndex } from '../sim/tiers'
import { tileToWorld } from './iso'
import { rectPath, type TileRect } from './shapes'

/** How long the two effects last, in milliseconds. */
const BUILT_MS = 420
const RISE_MS = 1500
/** No more than this many at once: a quarter of twenty houses does not need twenty flashes on a slow phone. */
const MAX_EFFECTS = 24

interface Effect {
  kind: 'built' | 'rise'
  rect: TileRect
  /** Name of the new tier, shown floating above a risen house. */
  label: string
  start: number
}

/** What changed between two building lists: buildings that are new and houses that rose a tier. */
export function changesBetween(before: PlacedBuilding[], after: PlacedBuilding[]): { built: PlacedBuilding[]; risen: PlacedBuilding[] } {
  const old = new Map(before.map((building) => [building.id, building]))
  const built: PlacedBuilding[] = []
  const risen: PlacedBuilding[] = []
  for (const building of after) {
    const previous = old.get(building.id)
    if (!previous) built.push(building)
    else if (building.house && previous.house && !building.house.ruin && tierIndex(building.house.tier) > tierIndex(previous.house.tier)) risen.push(building)
  }
  return { built, risen }
}

/**
 * Short feedback on the map: a new building flashes once, a house that rises glows and shows the name of its new
 * tier. The effects are found by comparing the buildings of the island on screen from frame to frame.
 */
export class MapEffects {
  private seen: { islandId: number; buildings: PlacedBuilding[] } | null = null
  private active: Effect[] = []

  /** Notes what changed since the last frame. Another island, or the first frame, starts without effects. */
  update(state: IslandState, now: number): void {
    const previous = this.seen
    if (previous?.buildings === state.buildings) return
    this.seen = { islandId: state.id, buildings: state.buildings }
    if (!previous || previous.islandId !== state.id || !state.owned || reducedMotion()) return
    const { built, risen } = changesBetween(previous.buildings, state.buildings)
    for (const building of built) {
      if (getBuilding(building.type).kind !== 'road') this.active.push({ kind: 'built', rect: buildingRect(building), label: '', start: now })
    }
    for (const building of risen) this.active.push({ kind: 'rise', rect: buildingRect(building), label: getTier(building.house!.tier).name, start: now })
    if (this.active.length > MAX_EFFECTS) this.active = this.active.slice(-MAX_EFFECTS)
  }

  draw(ctx: CanvasRenderingContext2D, now: number): void {
    if (this.active.length === 0) return
    this.active = this.active.filter((effect) => now - effect.start < (effect.kind === 'built' ? BUILT_MS : RISE_MS))
    ctx.save()
    for (const effect of this.active) {
      const age = now - effect.start
      if (effect.kind === 'built') drawBuilt(ctx, effect.rect, age / BUILT_MS)
      else drawRise(ctx, effect.rect, effect.label, age / RISE_MS)
    }
    ctx.restore()
  }
}

/** A light flash on the footprint and a ring that widens and fades: the building has landed. */
function drawBuilt(ctx: CanvasRenderingContext2D, rect: TileRect, share: number): void {
  const fade = 1 - share
  ctx.fillStyle = `rgba(255, 250, 225, ${0.4 * fade * fade})`
  ctx.beginPath()
  rectPath(ctx, rect)
  ctx.fill()
  const grow = 0.6 * (1 - fade * fade)
  ctx.strokeStyle = `rgba(255, 240, 190, ${0.9 * fade})`
  ctx.lineWidth = 2.5
  ctx.beginPath()
  rectPath(ctx, { x: rect.x - grow, y: rect.y - grow, w: rect.w + 2 * grow, h: rect.h + 2 * grow })
  ctx.stroke()
}

/** A golden glow on the footprint and the name of the new tier, floating up and fading. */
function drawRise(ctx: CanvasRenderingContext2D, rect: TileRect, label: string, share: number): void {
  const glow = Math.max(0, 1 - share * 2.2)
  if (glow > 0) {
    ctx.fillStyle = `rgba(255, 205, 80, ${0.55 * glow})`
    ctx.beginPath()
    rectPath(ctx, rect)
    ctx.fill()
  }
  const centre = tileToWorld(rect.x + rect.w / 2, rect.y + rect.h / 2)
  const y = centre.y - 62 - 26 * (1 - (1 - share) ** 2)
  ctx.globalAlpha = share < 0.7 ? 1 : Math.max(0, (1 - share) / 0.3)
  ctx.font = 'bold 15px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.lineWidth = 4
  ctx.strokeStyle = 'rgba(40, 24, 8, 0.9)'
  const text = `▲ ${label}`
  ctx.strokeText(text, centre.x, y)
  ctx.fillStyle = '#ffd97a'
  ctx.fillText(text, centre.x, y)
  ctx.globalAlpha = 1
}
