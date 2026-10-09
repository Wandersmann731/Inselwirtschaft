import { getBuilding } from '../data'
import { buildingRect, suppliedHouses, tilesInRadius } from '../sim/coverage'
import { checkPlacement, checkRoad, footprint } from '../sim/build'
import type { IslandState, PlacedBuilding } from '../sim/state'
import type { ToolSnapshot } from '../game/buildController'
import { tileToWorld } from './iso'
import { boxHeight, drawBox, rectPath, type TileRect } from './shapes'
import { diamondPath } from './terrainStyle'

const VALID = 'rgba(80, 220, 110, 0.5)'
const INVALID = 'rgba(235, 70, 70, 0.55)'
const COVERAGE = 'rgba(90, 200, 255, 0.3)'
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
    if (tool.mode === 'place' && tool.typeId && tool.origin) this.drawGhost(ctx, state, tool)
    else if (tool.stroke.length > 0) this.drawStroke(ctx, state, tool)
    else if (tool.mode === 'none' && tool.selectedBuildingId !== null) this.drawSelectedBuilding(ctx, state, tool)
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
    ctx.globalAlpha = 0.75
    drawBox(ctx, rect, boxHeight(rect, def.category), def.color)
    ctx.globalAlpha = 1
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
