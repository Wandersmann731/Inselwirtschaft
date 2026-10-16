import { HALF_H, HALF_W, tileToWorld } from './iso'
import type { TileRange } from './buildingRenderer'
import { Terrain, type GameMap } from '../world/terrain'

/** Number of wave groups along a coast. Each group runs a little later than the one before, so waves roll along the shore. */
const BUCKETS = 6
/** Seconds one wave needs to roll in. */
const WAVE_SECONDS = 4
/** How far out a wave starts, as a share of the way from the shore to the middle of the water tile. */
const REACH = 0.85
const FOAM = '255, 255, 255'

/** A water tile edge that touches land. Edges: 0 top-left, 1 top-right, 2 bottom-right, 3 bottom-left (neighbour x-1, y-1, x+1, y+1). */
export interface ShoreEdge {
  x: number
  y: number
  edge: number
  bucket: number
}

const NEIGHBOURS: [number, number][] = [[-1, 0], [0, -1], [1, 0], [0, 1]]

/** All water tile edges next to land (beach, grass, forest or mountain). Does not change while the game runs. */
export function findShores(map: GameMap): ShoreEdge[] {
  const shores: ShoreEdge[] = []
  const isLand = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < map.width && y < map.height && map.tiles[y * map.width + x] !== Terrain.Water
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      if (map.tiles[y * map.width + x] !== Terrain.Water) continue
      NEIGHBOURS.forEach(([dx, dy], edge) => {
        if (!isLand(x + dx, y + dy)) return
        const phase = (((x * 0.35 + y * 0.2) % 1) + 1) % 1
        shores.push({ x, y, edge, bucket: Math.floor(phase * BUCKETS) })
      })
    }
  }
  return shores
}

/** Corners of a tile diamond are top, right, bottom, left; edge i runs between these pairs. */
const EDGE_CORNERS: [number, number][][] = [
  [[0, 0], [-HALF_W, HALF_H]], // top -> left
  [[0, 0], [HALF_W, HALF_H]], // top -> right
  [[HALF_W, HALF_H], [0, 2 * HALF_H]], // right -> bottom
  [[-HALF_W, HALF_H], [0, 2 * HALF_H]], // left -> bottom
]

/** Foam along the coasts: a thin line at the edge of the land and waves that roll in and fade out. */
export class Surf {
  private shores = new WeakMap<GameMap, ShoreEdge[]>()

  draw(ctx: CanvasRenderingContext2D, map: GameMap, range: TileRange, now: number, animated: boolean): void {
    let list = this.shores.get(map)
    if (!list) {
      list = findShores(map)
      this.shores.set(map, list)
    }
    const visible = list.filter((s) => s.x >= range.minI - 1 && s.x <= range.maxI + 1 && s.y >= range.minJ - 1 && s.y <= range.maxJ + 1)
    if (visible.length === 0) return

    ctx.save()
    ctx.lineCap = 'round'
    // the foam line at the shore
    ctx.strokeStyle = `rgba(${FOAM}, ${animated ? 0.3 + 0.1 * Math.sin(now / 900) : 0.3})`
    ctx.lineWidth = 3
    ctx.beginPath()
    for (const shore of visible) this.addEdge(ctx, shore, 0)
    ctx.stroke()
    if (animated) {
      for (let bucket = 0; bucket < BUCKETS; bucket++) {
        // 0 = far out, 1 = at the shore; the group is offset by its place along the coast
        const progress = (now / 1000 / WAVE_SECONDS + bucket / BUCKETS) % 1
        const alpha = Math.sin(progress * Math.PI) * 0.5
        if (alpha < 0.02) continue
        ctx.strokeStyle = `rgba(${FOAM}, ${alpha})`
        ctx.lineWidth = 2 + 2 * progress
        ctx.beginPath()
        for (const shore of visible) if (shore.bucket === bucket) this.addEdge(ctx, shore, REACH * (1 - progress))
        ctx.stroke()
      }
    }
    ctx.restore()
  }

  /** Adds the edge of a shore tile to the path, moved `away` of the way towards the middle of the water tile. */
  private addEdge(ctx: CanvasRenderingContext2D, shore: ShoreEdge, away: number): void {
    const origin = tileToWorld(shore.x, shore.y)
    const [a, b] = EDGE_CORNERS[shore.edge]
    const toX = (0 - (a[0] + b[0]) / 2) * away
    const toY = (HALF_H - (a[1] + b[1]) / 2) * away
    ctx.moveTo(origin.x + a[0] + toX, origin.y + a[1] + toY)
    ctx.lineTo(origin.x + b[0] + toX, origin.y + b[1] + toY)
  }
}
