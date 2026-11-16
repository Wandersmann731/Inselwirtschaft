import { getBuilding } from '../data'
import { getTier } from '../sim/tiers'
import type { IslandState } from '../sim/state'
import { Terrain } from '../world/terrain'
import { HALF_H, HALF_W, mapBounds, tileToWorld, type Bounds, type Point } from './iso'
import { SEA_COLOR, SHALLOW_COLOR, TILE_COLORS } from './terrainStyle'

export interface MiniLayout {
  /** Size of the minimap in CSS pixels. */
  width: number
  height: number
  /** Minimap pixels per world pixel. */
  scale: number
  /** World area the minimap shows: the whole map diamond. */
  bounds: Bounds
}

/** Fits the whole island into maxWidth x maxHeight, keeping the proportions of the map. */
export function miniLayout(map: { width: number; height: number }, maxWidth: number, maxHeight: number): MiniLayout {
  const bounds = mapBounds(map)
  const worldW = bounds.maxX - bounds.minX
  const worldH = bounds.maxY - bounds.minY
  const scale = Math.min(maxWidth / worldW, maxHeight / worldH)
  return { width: Math.ceil(worldW * scale), height: Math.ceil(worldH * scale), scale, bounds }
}

export function worldToMini(layout: MiniLayout, wx: number, wy: number): Point {
  return { x: (wx - layout.bounds.minX) * layout.scale, y: (wy - layout.bounds.minY) * layout.scale }
}

export function miniToWorld(layout: MiniLayout, mx: number, my: number): Point {
  return { x: mx / layout.scale + layout.bounds.minX, y: my / layout.scale + layout.bounds.minY }
}

const ROAD_COLOR = '#d8c9a8'

/** Draws the terrain of an island into a context sized like the layout (times `pixelRatio`). */
export function drawMiniTerrain(ctx: CanvasRenderingContext2D, map: IslandState['map'], layout: MiniLayout, pixelRatio: number): void {
  const k = layout.scale * pixelRatio
  const w = Math.max(1, HALF_W * 2 * k + 0.6)
  const h = Math.max(1, HALF_H * 2 * k + 0.6)
  ctx.fillStyle = SEA_COLOR
  ctx.fillRect(0, 0, layout.width * pixelRatio, layout.height * pixelRatio)
  const land = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < map.width && y < map.height && map.tiles[y * map.width + x] !== Terrain.Water
  // the sea is lighter along a coast: the island gets an outline of shallows, as on the map itself. It is drawn
  // first, because the squares of neighbouring tiles overlap and the land must lie on top
  for (const shallows of [true, false]) {
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const terrain = map.tiles[y * map.width + x]
        if (shallows !== (terrain === Terrain.Water)) continue
        if (shallows && !land(x - 1, y) && !land(x + 1, y) && !land(x, y - 1) && !land(x, y + 1)) continue
        const top = tileToWorld(x, y)
        const p = worldToMini(layout, top.x, top.y + HALF_H)
        ctx.fillStyle = shallows ? SHALLOW_COLOR : TILE_COLORS[terrain]
        ctx.fillRect(p.x * pixelRatio - w / 2, p.y * pixelRatio - h / 2, w, h)
      }
    }
  }
}

/** Draws roads and buildings of an island on top of the terrain. */
export function drawMiniBuildings(ctx: CanvasRenderingContext2D, island: IslandState, layout: MiniLayout, pixelRatio: number): void {
  const { map } = island
  const k = layout.scale * pixelRatio
  const w = Math.max(1.5, HALF_W * 2 * k + 0.6)
  const h = Math.max(1.5, HALF_H * 2 * k + 0.6)
  const colors = new Map<number, string>()
  for (const building of island.buildings) {
    const house = building.house
    colors.set(building.id, house ? (house.ruin ? '#4d4a47' : getTier(house.tier).color) : getBuilding(building.type).color)
  }
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const index = y * map.width + x
      const building = island.occupancy[index]
      const color = building ? colors.get(building) : island.roads[index] ? ROAD_COLOR : undefined
      if (!color) continue
      const top = tileToWorld(x, y)
      const p = worldToMini(layout, top.x, top.y + HALF_H)
      ctx.fillStyle = color
      ctx.fillRect(p.x * pixelRatio - w / 2, p.y * pixelRatio - h / 2, w, h)
    }
  }
}
