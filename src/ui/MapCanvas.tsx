import { useEffect, useRef } from 'react'
import type { BuildController } from '../game/buildController'
import { haptic } from '../game/haptic'
import { MapInput } from '../input/touch'
import { MapRenderer } from '../render/mapRenderer'
import { getSettings } from '../save/settings'
import type { IslandState } from '../sim/state'


interface MapCanvasProps {
  getState: () => IslandState
  tool: BuildController
  /** Called with the renderer once it exists and with null when it is gone. */
  onRenderer?: (renderer: MapRenderer | null) => void
}

export function MapCanvas({ getState, tool, onRenderer }: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const renderer = new MapRenderer(canvas, getState, tool.getSnapshot, () => getSettings().debug)
    renderer.start()
    onRenderer?.(renderer)
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

  return <canvas ref={canvasRef} className="map-canvas" />
}
