import { useEffect, useRef } from 'react'
import { drawMiniBuildings, drawMiniTerrain, miniLayout, miniToWorld, worldToMini, type MiniLayout } from '../render/minimap'
import type { MapRenderer } from '../render/mapRenderer'
import type { IslandState } from '../sim/state'

const MAX_WIDTH = 168
const MAX_HEIGHT = 104
/** Upright phones have less room, so the overview map is smaller there. */
const PORTRAIT_SCALE = 0.7

interface MiniMapProps {
  getIsland: () => IslandState
  getRenderer: () => MapRenderer | null
}

/**
 * Small overview of the island on screen with a frame for the visible part. Tap or drag to move the camera.
 * The terrain is drawn once per island, roads and buildings again whenever they change.
 */
export function MiniMap({ getIsland, getRenderer }: MiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const layoutRef = useRef<MiniLayout | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    let rafId = 0
    let cached: { map: unknown; occupancy: unknown; roads: unknown; image: HTMLCanvasElement } | null = null
    let terrainImage: { map: unknown; image: HTMLCanvasElement } | null = null

    const frame = (): void => {
      const island = getIsland()
      const scale = window.matchMedia('(orientation: portrait)').matches ? PORTRAIT_SCALE : 1
      const layout = miniLayout(island.map, MAX_WIDTH * scale, MAX_HEIGHT * scale)
      layoutRef.current = layout
      const pixelWidth = Math.round(layout.width * dpr)
      const pixelHeight = Math.round(layout.height * dpr)
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth
        canvas.height = pixelHeight
        canvas.style.width = `${layout.width}px`
        canvas.style.height = `${layout.height}px`
        terrainImage = null
        cached = null
      }

      if (!terrainImage || terrainImage.map !== island.map) {
        const image = document.createElement('canvas')
        image.width = pixelWidth
        image.height = pixelHeight
        const imageCtx = image.getContext('2d')
        if (imageCtx) drawMiniTerrain(imageCtx, island.map, layout, dpr)
        terrainImage = { map: island.map, image }
        cached = null
      }
      if (!cached || cached.occupancy !== island.occupancy || cached.roads !== island.roads || cached.map !== island.map) {
        const image = document.createElement('canvas')
        image.width = pixelWidth
        image.height = pixelHeight
        const imageCtx = image.getContext('2d')
        if (imageCtx) {
          imageCtx.drawImage(terrainImage.image, 0, 0)
          drawMiniBuildings(imageCtx, island, layout, dpr)
        }
        cached = { map: island.map, occupancy: island.occupancy, roads: island.roads, image }
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.drawImage(cached.image, 0, 0)
      const renderer = getRenderer()
      if (renderer) {
        const rect = renderer.visibleRect()
        const a = worldToMini(layout, rect.minX, rect.minY)
        const b = worldToMini(layout, rect.maxX, rect.maxY)
        ctx.strokeStyle = '#ffd23f'
        ctx.lineWidth = 2 * dpr
        ctx.strokeRect(a.x * dpr, a.y * dpr, (b.x - a.x) * dpr, (b.y - a.y) * dpr)
      }
      rafId = requestAnimationFrame(frame)
    }
    rafId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafId)
  }, [getIsland, getRenderer])

  const moveTo = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const layout = layoutRef.current
    const renderer = getRenderer()
    if (!layout || !renderer) return
    const rect = event.currentTarget.getBoundingClientRect()
    const world = miniToWorld(layout, event.clientX - rect.left, event.clientY - rect.top)
    renderer.centerOnWorld(world.x, world.y)
  }

  return (
    <canvas
      ref={canvasRef}
      className="minimap"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        moveTo(event)
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) moveTo(event)
      }}
    />
  )
}
