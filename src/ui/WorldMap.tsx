import { useEffect, useMemo, useRef, useState } from 'react'
import { islandName } from '../i18n/dataNames'
import { sprites } from '../render/sprites'
import { drawChart, drawPlate, islandOutlines } from '../render/worldChart'
import type { GameState } from '../sim/state'
import { t } from '../i18n/language'

interface WorldMapProps {
  state: GameState
  activeIsland: number
  onSelect: (islandId: number) => void
  onClose: () => void
}

/** The world map: all islands on the sea. Tap an island to look at it. */
export function WorldMap({ state, activeIsland, onSelect, onClose }: WorldMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { width, height } = state.world
  const [size, setSize] = useState('')
  // the coasts only change with the world
  const outlines = useMemo(() => islandOutlines(state.world), [state.world])

  // Size the canvas only when its shown size changes (also on rotation while paused), not on every tick.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const measure = (): void => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      const w = Math.round(rect.width * dpr)
      const h = Math.round(rect.height * dpr)
      if (canvas.width === w && canvas.height === h) return
      canvas.width = w
      canvas.height = h
      setSize(`${w}x${h}`)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const scale = Math.min(canvas.width / width, canvas.height / height)
    const offsetX = (canvas.width - width * scale) / 2
    const offsetY = (canvas.height - height * scale) / 2

    drawChart(ctx, outlines, state.islands, activeIsland, { scale, offsetX, offsetY }, dpr)

    for (const ship of state.ships) {
      const sx = offsetX + (ship.x + 0.5) * scale
      const sy = offsetY + (ship.y + 0.5) * scale
      if (ship.path.length > 0) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
        ctx.lineWidth = 1.5 * dpr
        ctx.setLineDash([4 * dpr, 4 * dpr])
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        for (const point of ship.path) ctx.lineTo(offsetX + (point.x + 0.5) * scale, offsetY + (point.y + 0.5) * scale)
        ctx.stroke()
        ctx.setLineDash([])
      }
      const image = sprites.get('ships/ship_top')
      if (image) {
        // The ship picture points up; turn it towards where the ship is going.
        const next = ship.path[0]
        const angle = next ? Math.atan2(next.y - ship.y, next.x - ship.x) + Math.PI / 2 : 0
        const size = 26 * dpr
        ctx.save()
        ctx.translate(sx, sy)
        ctx.rotate(angle)
        ctx.drawImage(image, -size / 2, -size / 2, size, size)
        ctx.restore()
      } else {
        ctx.fillStyle = '#ffffff'
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 1.5 * dpr
        ctx.beginPath()
        ctx.arc(sx, sy, 5 * dpr, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
    }

    const islandById = new Map(state.islands.map((island) => [island.id, island]))
    for (const placement of state.world.placements) {
      const island = islandById.get(placement.id)
      if (!island) continue
      const x = offsetX + (placement.x + placement.w / 2) * scale
      const y = offsetY + (placement.y + placement.h / 2) * scale
      const label = island.owned ? islandName(island.name) : `${islandName(island.name)} (${island.role === 'trader' ? t('Händler', 'traders') : t('frei', 'free')})`
      drawPlate(ctx, label, x, y, dpr)
    }
  }, [state.world, state.islands, state.ships, activeIsland, width, height, outlines, size])

  const choose = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect()
    const scale = Math.min(rect.width / width, rect.height / height)
    const cx = Math.floor((event.clientX - rect.left - (rect.width - width * scale) / 2) / scale)
    const cy = Math.floor((event.clientY - rect.top - (rect.height - height * scale) / 2) / scale)
    // Tapping the island's box counts, not only its land cells.
    const hit = state.world.placements.find(
      (p) => cx >= p.x && cx < p.x + p.w && cy >= p.y && cy < p.y + p.h,
    )
    if (hit) onSelect(hit.id)
  }

  return (
    <div className="world-backdrop">
      <div className="world-panel">
        <div className="panel-title">
          <strong>{t('Weltkarte', 'World map')}</strong>
          <button type="button" className="panel-close" onClick={onClose} aria-label={t('Schließen', 'Close')}>
            ×
          </button>
        </div>
        <canvas ref={canvasRef} className="world-canvas" onPointerUp={choose} />
      </div>
    </div>
  )
}
