import { useEffect, useRef } from 'react'
import type { BuildController } from '../game/buildController'
import { haptic } from '../game/haptic'
import { MapInput } from '../input/touch'
import { MapRenderer } from '../render/mapRenderer'
import { getSettings } from '../save/settings'
import type { IslandState } from '../sim/state'
import { reducedMotion } from '../save/motion'


interface MapCanvasProps {
  getState: () => IslandState
  tool: BuildController
  /** Called with the renderer once it exists and with null when it is gone. */
  onRenderer?: (renderer: MapRenderer | null) => void
}

/** Room kept between a tapped building and its info panel, and the time the map takes to slide there. */
const REVEAL_MARGIN = 72
const REVEAL_MS = 220

/**
 * Slides the map so the building tapped at (x, y) is not hidden under its info panel: to the left of the panel
 * if there is room, else below it. Runs once the panel is on screen.
 */
function revealBesidePanel(renderer: MapRenderer, x: number, y: number): void {
  const panel = document.querySelector('.building-panel')?.getBoundingClientRect()
  if (!panel) return
  const covered = x > panel.left - REVEAL_MARGIN && x < panel.right + REVEAL_MARGIN && y > panel.top - REVEAL_MARGIN && y < panel.bottom + REVEAL_MARGIN
  if (!covered) return
  const roomLeft = panel.left > REVEAL_MARGIN * 2.5
  const dx = roomLeft ? panel.left - REVEAL_MARGIN - x : 0
  const dy = roomLeft ? 0 : panel.bottom + REVEAL_MARGIN - y
  if (reducedMotion()) return renderer.panBy(dx, dy)
  const start = performance.now()
  let done = 0
  const step = (now: number): void => {
    const share = Math.min(1, (now - start) / REVEAL_MS)
    const eased = 1 - (1 - share) * (1 - share)
    renderer.panBy(dx * (eased - done), dy * (eased - done))
    done = eased
    if (share < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

export function MapCanvas({ getState, tool, onRenderer }: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const marksRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const renderer = new MapRenderer(canvas, getState, tool.getSnapshot, () => getSettings().debug)
    if (marksRef.current) renderer.setMarkLayer(marksRef.current)
    renderer.start()
    onRenderer?.(renderer)
    // development only: scripts/compare sets the camera of its test scene through this
    if (import.meta.env.DEV) (window as unknown as { __mapRenderer?: MapRenderer }).__mapRenderer = renderer
    let grabStart = { x: 0, y: 0 }
    tool.setViewCenter(() => renderer.tileAt(canvas.clientWidth / 2, canvas.clientHeight * 0.42))
    const handleTap = (x: number, y: number): void => {
      const { mode, freehand } = tool.getSnapshot()
      if (mode === 'place') {
        // a tap or click builds right there; where it cannot be built, the ghost shows why
        const tile = renderer.tileAt(x, y)
        if (tile) tool.placeAt(tile)
      } else if (mode === 'road' && !freehand) {
        const tile = renderer.tileAt(x, y)
        if (tile) tool.routeTap(tile)
      } else {
        const tile = renderer.tileAt(x, y)
        const state = getState()
        const id = tile ? state.occupancy[tile.y * state.map.width + tile.x] : 0
        if (id) renderer.selectAt(x, y)
        else renderer.clearSelection()
        tool.selectBuilding(id || null)
        // after React has put the panel on screen
        if (id) requestAnimationFrame(() => requestAnimationFrame(() => revealBesidePanel(renderer, x, y)))
      }
    }
    const input = new MapInput(canvas, {
      onPan: (dx, dy) => renderer.panBy(dx, dy),
      onZoom: (factor, x, y) => renderer.zoomAt(factor, x, y),
      onTap: (x, y) => handleTap(x, y),
      onLongPress: (x, y) => {
        const tile = renderer.tileAt(x, y)
        const state = getState()
        const id = tile ? state.occupancy[tile.y * state.map.width + tile.x] : 0
        if (!id) return
        haptic(25)
        renderer.selectAt(x, y)
        tool.inspect(id)
        requestAnimationFrame(() => requestAnimationFrame(() => revealBesidePanel(renderer, x, y)))
      },
      onGrab: (x, y, pointerType) => {
        // with a mouse the ghost follows the pointer: dragging moves the map, a click builds
        if (pointerType === 'mouse' && tool.getSnapshot().mode === 'place') return false
        const tile = renderer.tileAt(x, y)
        grabStart = { x, y }
        return tile ? tool.grab(tile) : false
      },
      onHover: (x, y) => {
        const tile = renderer.tileAt(x, y)
        if (tile) tool.hover(tile)
      },
      onStrokeStart: (x, y) => {
        const tile = renderer.tileAt(x, y)
        if (tile) tool.strokeStart(tile)
      },
      onStrokeMove: (x, y) => {
        const tile = renderer.tileAt(x, y)
        if (!tile) return
        if (tool.grabbing) tool.grabMove(tile)
        else tool.strokeMove(tile)
      },
      onStrokeEnd: () => {
        if (!tool.grabbing) return tool.strokeEnd()
        // a touch on the ghost building that did not move it counts as a tap: it builds there
        if (!tool.grabRelease() && tool.getSnapshot().mode === 'place') handleTap(grabStart.x, grabStart.y)
      },
      onStrokeCancel: () => (tool.grabbing ? void tool.grabRelease() : tool.strokeCancel()),
    })
    input.setMode(tool.inputMode)
    const unsubscribe = tool.subscribe(() => {
      input.setMode(tool.inputMode)
      // the tapped tile is only marked while its building panel is open
      const { mode, selectedBuildingId } = tool.getSnapshot()
      if (mode !== 'none' || selectedBuildingId === null) renderer.clearSelection()
    })
    return () => {
      onRenderer?.(null)
      unsubscribe()
      input.destroy()
      renderer.destroy()
    }
  }, [getState, tool, onRenderer])

  return (
    <>
      <canvas ref={canvasRef} className="map-canvas" />
      {/* daylight over the map: warm where the sun comes from, a little darker towards the corners (see theme.css) */}
      <div className="map-light" aria-hidden="true" />
      {/* hints over the buildings: glowing points made of CSS, placed by the map (render/markLayer.ts) */}
      <div ref={marksRef} className="map-marks" aria-hidden="true" />
    </>
  )
}
