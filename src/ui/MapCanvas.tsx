import { useEffect, useRef } from 'react'
import type { BuildController } from '../game/buildController'
import { world } from '../data'
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
          if (last && lastTap.time - last.time < world.input.doubleTapMs && Math.abs(last.tile.x - tile.x) <= 1 && Math.abs(last.tile.y - tile.y) <= 1) {
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
          const tile = renderer.tileAt(x, y)
          const state = getState()
          const id = tile ? state.occupancy[tile.y * state.map.width + tile.x] : 0
          if (id) renderer.selectAt(x, y)
          else renderer.clearSelection()
          tool.selectBuilding(id || null)
        }
      },
      onLongPress: (x, y) => {
        const tile = renderer.tileAt(x, y)
        const state = getState()
        const id = tile ? state.occupancy[tile.y * state.map.width + tile.x] : 0
        if (!id) return
        haptic(25)
        renderer.selectAt(x, y)
        tool.inspect(id)
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
