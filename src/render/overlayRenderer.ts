import { getBuilding } from '../data'
import { buildingRect, suppliedHouses, tilesInRadius } from '../sim/coverage'
import { checkPlacement, checkRoad, footprint } from '../sim/build'
import type { IslandState, PlacedBuilding } from '../sim/state'
import type { ToolSnapshot } from '../game/buildController'
import { HALF_H, tileToWorld } from './iso'
import { drawPlacedSprite, placeSprite } from './spriteDraw'
import { ghostKey } from './spriteKeys'
import { boxHeight, drawBox, rectPath, type TileRect } from './shapes'
import { diamondPath } from './terrainStyle'

const VALID = 'rgba(80, 220, 110, 0.5)'
const INVALID = 'rgba(235, 70, 70, 0.55)'
const COVERAGE = 'rgba(90, 200, 255, 0.3)'
const EXISTING = 'rgba(90, 170, 255, 0.45)'
const SUPPLIED = 'rgba(120, 255, 160, 0.45)'

interface CoverageCache {
  key: string
  buildings: PlacedBuilding[]
  tiles: { x: number; y: number }[]
  houses: PlacedBuilding[]
}

/** Draws the placement ghost, supply radius, supplied houses and the drag preview. */
export class OverlayRenderer {
  private coverage: CoverageCache | null = null

  draw(ctx: CanvasRenderingContext2D, state: IslandState, tool: ToolSnapshot): void {
    if (tool.mode === 'place' && tool.area) this.drawArea(ctx, tool)
    else if (tool.mode === 'place' && tool.typeId && tool.origin) this.drawGhost(ctx, state, tool)
    else if (tool.mode === 'road' && !tool.freehand) this.drawRoute(ctx, tool, state)
    else if (tool.stroke.length > 0) this.drawStroke(ctx, state, tool)
    else if (tool.mode === 'none' && tool.selectedBuildingId !== null) this.drawSelectedBuilding(ctx, state, tool)
  }

  /** The dragged area and the houses the game plans in it. */
  private drawArea(ctx: CanvasRenderingContext2D, tool: ToolSnapshot): void {
    const { area, typeId } = tool
    if (!area || !typeId) return
    const def = getBuilding(typeId)
    const rect: TileRect = {
      x: Math.min(area.a.x, area.b.x),
      y: Math.min(area.a.y, area.b.y),
      w: Math.abs(area.a.x - area.b.x) + 1,
      h: Math.abs(area.a.y - area.b.y) + 1,
    }
    ctx.fillStyle = 'rgba(255, 210, 63, 0.18)'
    ctx.beginPath()
    rectPath(ctx, rect)
    ctx.fill()
    ctx.strokeStyle = '#ffd23f'
    ctx.lineWidth = 2
    ctx.stroke()
    // back to front, so near houses cover far ones
    const houses = [...area.origins].sort((p, q) => p.x + p.y - (q.x + q.y))
    for (const origin of houses) {
      const footprintRect: TileRect = { x: origin.x, y: origin.y, w: def.size[0], h: def.size[1] }
      ctx.fillStyle = VALID
      ctx.beginPath()
      rectPath(ctx, footprintRect)
      ctx.fill()
      const placed = placeSprite({ type: typeId, x: origin.x, y: origin.y, rotated: false, house: undefined }, ghostKey(typeId))
      if (placed) drawPlacedSprite(ctx, placed, 0.75)
      else drawBox(ctx, footprintRect, boxHeight(footprintRect, def.category), def.color)
    }
  }

  private drawSelectedBuilding(ctx: CanvasRenderingContext2D, state: IslandState, tool: ToolSnapshot): void {
    const building = state.buildings.find((b) => b.id === tool.selectedBuildingId)
    if (!building) return
    ctx.strokeStyle = '#ffd23f'
    ctx.lineWidth = 3
    ctx.beginPath()
    rectPath(ctx, buildingRect(building))
    ctx.stroke()
  }

  private drawGhost(ctx: CanvasRenderingContext2D, state: IslandState, tool: ToolSnapshot): void {
    const { typeId, origin, rotated } = tool
    if (!typeId || !origin) return
    const def = getBuilding(typeId)
    const { w, h } = footprint(def, rotated)
    const rect: TileRect = { x: origin.x, y: origin.y, w, h }

    if (def.radius !== undefined) this.drawCoverage(ctx, state, typeId, rect, def.radius, rotated)

    const valid = checkPlacement(state, typeId, origin.x, origin.y, rotated) === null
    ctx.fillStyle = valid ? VALID : INVALID
    ctx.beginPath()
    rectPath(ctx, rect)
    ctx.fill()
    const placed = placeSprite({ type: typeId, x: origin.x, y: origin.y, rotated, house: undefined }, ghostKey(typeId))
    if (placed) {
      drawPlacedSprite(ctx, placed, 0.75)
    } else {
      ctx.globalAlpha = 0.75
      drawBox(ctx, rect, boxHeight(rect, def.category), def.color)
      ctx.globalAlpha = 1
    }
    ctx.strokeStyle = valid ? '#2fd45a' : '#ff4040'
    ctx.lineWidth = 2
    ctx.beginPath()
    rectPath(ctx, rect)
    ctx.stroke()
  }

  private drawCoverage(
    ctx: CanvasRenderingContext2D,
    state: IslandState,
    typeId: string,
    rect: TileRect,
    radius: number,
    rotated: boolean,
  ): void {
    const key = `${typeId}:${rect.x},${rect.y}:${rotated}`
    if (!this.coverage || this.coverage.key !== key || this.coverage.buildings !== state.buildings) {
      this.coverage = {
        key,
        buildings: state.buildings,
        tiles: tilesInRadius(rect, radius, state.map.width, state.map.height),
        houses: suppliedHouses(state, rect, radius),
      }
    }
    ctx.fillStyle = COVERAGE
    ctx.beginPath()
    for (const tile of this.coverage.tiles) {
      const top = tileToWorld(tile.x, tile.y)
      diamondPath(ctx, top.x, top.y, 0.5)
    }
    ctx.fill()

    ctx.fillStyle = SUPPLIED
    ctx.strokeStyle = '#2fd45a'
    ctx.lineWidth = 2
    for (const house of this.coverage.houses) {
      ctx.beginPath()
      rectPath(ctx, buildingRect(house))
      ctx.fill()
      ctx.stroke()
    }
  }

  /** The planned road: new tiles green, tiles that already have a road blue, and the handles to pull on. */
  private drawRoute(ctx: CanvasRenderingContext2D, tool: ToolSnapshot, _state: IslandState): void {
    const { start, end, via, plan } = tool.route
    if (plan) {
      const fresh = new Set(plan.newTiles.map((t) => `${t.x},${t.y}`))
      for (const tile of plan.tiles) {
        const top = tileToWorld(tile.x, tile.y)
        diamondPath(ctx, top.x, top.y, 0.5)
        ctx.fillStyle = fresh.has(`${tile.x},${tile.y}`) ? VALID : EXISTING
        ctx.fill()
      }
    }
    for (const point of via) this.drawHandle(ctx, point, '', '#ffffff', 9)
    if (start) this.drawHandle(ctx, start, 'A', '#3d8bff', 15)
    if (end) this.drawHandle(ctx, end, 'B', '#ff8a2a', 15)
  }

  private drawHandle(ctx: CanvasRenderingContext2D, tile: { x: number; y: number }, label: string, color: string, radius: number): void {
    const top = tileToWorld(tile.x, tile.y)
    const y = top.y + HALF_H
    ctx.beginPath()
    ctx.arc(top.x, y, radius, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = '#1b1b1b'
    ctx.stroke()
    if (label) {
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 16px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, top.x, y + 1)
    }
  }

  private drawStroke(ctx: CanvasRenderingContext2D, state: IslandState, tool: ToolSnapshot): void {
    const demolish = tool.mode === 'demolish'
    const { width } = state.map
    for (const tile of tool.stroke) {
      const index = tile.y * width + tile.x
      const ok = demolish
        ? state.occupancy[index] !== 0 || state.roads[index] !== 0
        : checkRoad(state, tile.x, tile.y) === null
      const top = tileToWorld(tile.x, tile.y)
      diamondPath(ctx, top.x, top.y, 0.5)
      ctx.fillStyle = ok ? (demolish ? 'rgba(255, 170, 40, 0.6)' : VALID) : INVALID
      ctx.fill()
    }
  }
}
