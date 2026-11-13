// Where the camera stands when an island is first shown.
import type { IslandState } from '../sim/state'
import { findStartSite } from '../world/startSite'
import { centerCamera, clampCamera, type Camera, type Viewport } from './camera'
import { mapBounds, tileToWorld } from './iso'

/**
 * The first view of an island: the town of others at its market; your own settlement at its trading post; and
 * before the first house the free ground beside it, where the first houses go (the ghost building starts in the
 * middle of the screen). Pure.
 */
export function openingCamera(shown: IslandState, viewport: Viewport): Camera {
  const bounds = mapBounds(shown.map)
  const camera = centerCamera(bounds, 1, viewport)
  const market = shown.buildings.find((b) => b.type === 'market_house') ?? shown.buildings.find((b) => b.type === 'kontor')
  if (!shown.owned) {
    if (!market) return camera
    const at = tileToWorld(market.x + 1, market.y + 1)
    return clampCamera({ ...camera, x: at.x, y: at.y }, viewport, bounds)
  }
  const kontor = shown.buildings.find((b) => b.type === 'kontor') ?? market
  const settled = shown.buildings.some((b) => b.house)
  const site = settled && kontor ? { x: kontor.x + 0.5, y: kontor.y + 0.5 } : findStartSite(shown.map)
  const at = tileToWorld(site.x + 0.5, site.y + 0.5)
  return clampCamera({ ...camera, x: at.x, y: at.y }, viewport, bounds)
}
