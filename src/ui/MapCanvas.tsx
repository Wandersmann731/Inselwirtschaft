import { useEffect, useRef } from 'react'
import { MapRenderer } from '../render/mapRenderer'
import type { GameState } from '../sim/state'

export function MapCanvas({ getState }: { getState: () => GameState }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const renderer = new MapRenderer(canvas, getState)
    renderer.start()
    return () => renderer.destroy()
  }, [getState])

  return <canvas ref={canvasRef} className="map-canvas" />
}
