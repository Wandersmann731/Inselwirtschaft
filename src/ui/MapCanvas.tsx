import { useEffect, useRef } from 'react'
import type { BuildController } from '../game/buildController'
import { MapInput } from '../input/touch'
import { MapRenderer } from '../render/mapRenderer'
import type { IslandState } from '../sim/state'

const DEBUG = new URLSearchParams(window.location.search).has('debug')

interface MapCanvasProps {
  getState: () => IslandState
  tool: BuildController
}

export function MapCanvas({ getState, tool }: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const renderer = new MapRenderer(canvas, getState, tool.getSnapshot, DEBUG)
    renderer.start()
    const input = new MapInput(canvas, {
      onPan: (dx, dy) => renderer.panBy(dx, dy),
      onZoom: (factor, x, y) => renderer.zoomAt(factor, x, y),
      onTap: (x, y) => {
        if (tool.getSnapshot().mode === 'place') {
          const tile = renderer.tileAt(x, y)
          if (tile) tool.setCenter(tile)
        } else {
          renderer.selectAt(x, y)
          const tile = renderer.tileAt(x, y)
          const state = getState()
          const id = tile ? state.occupancy[tile.y * state.map.width + tile.x] : 0
          tool.selectBuilding(id || null)
        }
      },
      onStrokeStart: (x, y) => {
        const tile = renderer.tileAt(x, y)
        if (tile) tool.strokeStart(tile)
      },
      onStrokeMove: (x, y) => {
        const tile = renderer.tileAt(x, y)
        if (tile) tool.strokeMove(tile)
      },
      onStrokeEnd: () => tool.strokeEnd(),
      onStrokeCancel: () => tool.strokeCancel(),
    })
    input.setDrawMode(tool.drawing)
    const unsubscribe = tool.subscribe(() => input.setDrawMode(tool.drawing))
    return () => {
      unsubscribe()
      input.destroy()
      renderer.destroy()
    }
  }, [getState, tool])

  return <canvas ref={canvasRef} className="map-canvas" />
}
