import { useEffect, useRef } from 'react'
import { MapInput } from '../input/touch'
import { MapRenderer } from '../render/mapRenderer'
import type { GameState } from '../sim/state'

const DEBUG = new URLSearchParams(window.location.search).has('debug')

export function MapCanvas({ getState }: { getState: () => GameState }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const renderer = new MapRenderer(canvas, getState, DEBUG)
    renderer.start()
    const input = new MapInput(canvas, {
      onPan: (dx, dy) => renderer.panBy(dx, dy),
      onZoom: (factor, x, y) => renderer.zoomAt(factor, x, y),
      onTap: (x, y) => renderer.selectAt(x, y),
    })
    return () => {
      input.destroy()
      renderer.destroy()
    }
  }, [getState])

  return <canvas ref={canvasRef} className="map-canvas" />
}
