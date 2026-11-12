// The sea chart of the world map: islands with smooth coasts on a sea with wave marks and a compass rose.
// Everything is drawn with canvas paths; the coasts come from the same outline search as the surf on the island map.

import { climates } from '../data'
import type { GameState } from '../sim/state'
import { hash2 } from '../world/noise2d'
import { Terrain } from '../world/terrain'
import { findCoastLines, type TilePoint } from './surf'

export interface IslandOutline {
  id: number
  /** Closed coast lines in sea cells; the first point is repeated at the end. */
  lines: TilePoint[][]
}

/** Where the chart lies on the canvas: sea cell (x, y) is drawn at (offsetX + x * scale, offsetY + y * scale). */
export interface ChartLayout {
  scale: number
  offsetX: number
  offsetY: number
}

/** The coast lines of every island on the world map. Only changes with the world. */
export function islandOutlines(world: GameState['world']): IslandOutline[] {
  return world.placements.map((placement) => ({
    id: placement.id,
    lines: findCoastLines({
      width: world.width,
      height: world.height,
      tiles: world.cells.map((cell) => (cell === placement.id + 1 ? Terrain.Grass : Terrain.Water)),
    }),
  }))
}

/** A closed, rounded path through the points of a coast line. */
function coastPath(ctx: CanvasRenderingContext2D, line: TilePoint[], layout: ChartLayout): void {
  const points = line.slice(0, -1)
  const count = points.length
  if (count < 3) return
  const at = (k: number): [number, number] => {
    const [x, y] = points[((k % count) + count) % count]
    return [layout.offsetX + x * layout.scale, layout.offsetY + y * layout.scale]
  }
  const mid = (k: number): [number, number] => {
    const [ax, ay] = at(k)
    const [bx, by] = at(k + 1)
    return [(ax + bx) / 2, (ay + by) / 2]
  }
  ctx.moveTo(...mid(0))
  for (let k = 1; k <= count; k++) {
    const [cx, cy] = at(k)
    const [mx, my] = mid(k)
    ctx.quadraticCurveTo(cx, cy, mx, my)
  }
  ctx.closePath()
}

function drawSea(ctx: CanvasRenderingContext2D, width: number, height: number, dpr: number): void {
  const sea = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.15, width / 2, height / 2, Math.max(width, height) * 0.7)
  sea.addColorStop(0, '#2f7ea6')
  sea.addColorStop(1, '#17486a')
  ctx.fillStyle = sea
  ctx.fillRect(0, 0, width, height)
  // small wave marks, always at the same places
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)'
  ctx.lineWidth = 1.2 * dpr
  ctx.lineCap = 'round'
  ctx.beginPath()
  const marks = Math.round((width * height) / (5200 * dpr * dpr))
  for (let i = 0; i < marks; i++) {
    const x = hash2(i, 1, 311) * width
    const y = hash2(i, 2, 311) * height
    const w = 5 * dpr
    ctx.moveTo(x - w, y)
    ctx.quadraticCurveTo(x - w / 2, y - w / 2, x, y)
    ctx.quadraticCurveTo(x + w / 2, y + w / 2, x + w, y)
  }
  ctx.stroke()
}

/** A compass rose in the corner: a ring, a four-pointed star and the north mark. */
function drawCompass(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, dpr: number): void {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.globalAlpha = 0.85
  ctx.strokeStyle = '#f6ecd6'
  ctx.lineWidth = 1.5 * dpr
  ctx.beginPath()
  ctx.arc(0, 0, radius * 0.72, 0, Math.PI * 2)
  ctx.stroke()
  for (let k = 0; k < 4; k++) {
    ctx.rotate(Math.PI / 2)
    ctx.fillStyle = k % 2 === 0 ? '#f6ecd6' : '#dba744'
    ctx.beginPath()
    ctx.moveTo(0, -radius)
    ctx.lineTo(radius * 0.17, 0)
    ctx.lineTo(-radius * 0.17, 0)
    ctx.closePath()
    ctx.fill()
  }
  ctx.fillStyle = '#f6ecd6'
  ctx.font = `bold ${Math.round(12 * dpr)}px Palatino, Georgia, serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText('N', 0, -radius - 4 * dpr)
  ctx.restore()
}

/** Sea, islands and compass. The island on screen in the game gets a golden coast. */
export function drawChart(
  ctx: CanvasRenderingContext2D,
  outlines: IslandOutline[],
  islands: GameState['islands'],
  activeIsland: number,
  layout: ChartLayout,
  dpr: number,
): void {
  const { width, height } = ctx.canvas
  drawSea(ctx, width, height, dpr)
  const colors = new Map(climates.map((climate) => [climate.id, climate.color]))
  ctx.lineJoin = 'round'
  for (const outline of outlines) {
    const island = islands.find((entry) => entry.id === outline.id)
    ctx.beginPath()
    for (const line of outline.lines) coastPath(ctx, line, layout)
    // shallow water around the coast, then the land, then a rim of sand
    ctx.strokeStyle = 'rgba(150, 220, 232, 0.32)'
    ctx.lineWidth = 9 * dpr
    ctx.stroke()
    ctx.fillStyle = colors.get(island?.climate ?? '') ?? '#888'
    ctx.fill('evenodd')
    ctx.strokeStyle = '#ead7a6'
    ctx.lineWidth = 2.5 * dpr
    ctx.stroke()
    if (outline.id === activeIsland) {
      ctx.save()
      ctx.shadowColor = 'rgba(255, 215, 110, 0.9)'
      ctx.shadowBlur = 10 * dpr
      ctx.strokeStyle = '#f5cf6b'
      ctx.lineWidth = 3 * dpr
      ctx.stroke()
      ctx.restore()
    }
  }
  const radius = 20 * dpr
  drawCompass(ctx, width - radius - 16 * dpr, height - radius - 12 * dpr, radius, dpr)
}

/** A name plate like a strip of parchment, centred on (x, y). */
export function drawPlate(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, dpr: number): void {
  ctx.font = `bold ${Math.round(13 * dpr)}px Palatino, 'Book Antiqua', Georgia, serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const w = ctx.measureText(text).width + 14 * dpr
  const h = 20 * dpr
  const r = 5 * dpr
  const left = x - w / 2
  const top = y - h / 2
  ctx.beginPath()
  ctx.moveTo(left + r, top)
  ctx.arcTo(left + w, top, left + w, top + h, r)
  ctx.arcTo(left + w, top + h, left, top + h, r)
  ctx.arcTo(left, top + h, left, top, r)
  ctx.arcTo(left, top, left + w, top, r)
  ctx.closePath()
  ctx.fillStyle = 'rgba(244, 232, 204, 0.94)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(90, 62, 30, 0.8)'
  ctx.lineWidth = 1 * dpr
  ctx.stroke()
  ctx.fillStyle = '#2e2219'
  ctx.fillText(text, x, y + 0.5 * dpr)
}
