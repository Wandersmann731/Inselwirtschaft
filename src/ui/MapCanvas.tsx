import { useEffect, useRef } from 'react'
import type { BuildController } from '../game/buildController'
import { MapInput } from '../input/touch'
import { MapRenderer } from '../render/mapRenderer'
import { getSettings } from '../save/settings'
import type { IslandState } from '../sim/state'


/** Two taps this close in time build the building under the ghost. */
const DOUBLE_TAP_MS = 450

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
    let lastTap: { tile: { x: number; y: number }; time: number } | null = null
    const renderer = new MapRenderer(canvas, getState, tool.getSnapshot, () => getSettings().debug)
    renderer.start()
    onRenderer?.(renderer)
    const input = new MapInput(canvas, {
      onPan: (dx, dy) => renderer.panBy(dx, dy),
      onZoom: (factor, x, y) => renderer.zoomAt(factor, x, y),
      onTap: (x, y) => {
        const { mode, freehand } = tool.getSnapshot()
        if (mode === 'place') {
          const tile = renderer.tileAt(x, y)
          if (!tile) return
          // a second tap on the same spot builds
          const last = lastTap
          lastTap = { tile, time: performance.now() }
          if (last && lastTap.time - last.time < DOUBLE_TAP_MS && Math.abs(last.tile.x - tile.x) <= 1 && Math.abs(last.tile.y - tile.y) <= 1) {
            tool.setCenter(tile)
            tool.confirm()
            lastTap = null
          } else {
            tool.setCenter(tile)
          }
        } else if (mode === 'road' && !freehand) {
          const tile = renderer.tileAt(x, y)
          if (tile) tool.routeTap(tile)
        } else {
          renderer.selectAt(x, y)
          const tile = renderer.tileAt(x, y)
          const state = getState()
          const id = tile ? state.occupancy[tile.y * state.map.width + tile.x] : 0
          tool.selectBuilding(id || null)
        }
      },
      onGrab: (x, y) => {
        const tile = renderer.tileAt(x, y)
        return tile ? tool.routeGrab(tile) : false
      },
      onStrokeStart: (x, y) => {
        const tile = renderer.tileAt(x, y)
        if (tile) tool.strokeStart(tile)
      },
      onStrokeMove: (x, y) => {
        const tile = renderer.tileAt(x, y)
        if (!tile) return
        if (tool.grabbing) tool.routeMove(tile)
        else tool.strokeMove(tile)
      },
      onStrokeEnd: () => (tool.grabbing ? tool.routeRelease() : tool.strokeEnd()),
      onStrokeCancel: () => (tool.grabbing ? tool.routeRelease() : tool.strokeCancel()),
    })
    input.setMode(tool.inputMode)
    const unsubscribe = tool.subscribe(() => input.setMode(tool.inputMode))
    return () => {
      onRenderer?.(null)
      unsubscribe()
      input.destroy()
      renderer.destroy()
    }
  }, [getState, tool, onRenderer])

  return <canvas ref={canvasRef} className="map-canvas" />
}
