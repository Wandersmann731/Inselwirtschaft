import { useEffect, useRef } from 'react'
import { climates } from '../data'
import { sprites } from '../render/sprites'
import type { GameState } from '../sim/state'

const SEA = '#1d4e6b'

interface WorldMapProps {
  state: GameState
  activeIsland: number
  onSelect: (islandId: number) => void
  onClose: () => void
}

/** The world map: all islands on the sea. Tap an island to look at it. */
export function WorldMap({ state, activeIsland, onSelect, onClose }: WorldMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { width, height, cells } = state.world

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.round(rect.width * dpr)
    canvas.height = Math.round(rect.height * dpr)
    const scale = Math.min(canvas.width / width, canvas.height / height)
    const offsetX = (canvas.width - width * scale) / 2
    const offsetY = (canvas.height - height * scale) / 2

    ctx.fillStyle = SEA
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const id = cells[y * width + x]
        if (id === 0) continue
        const island = state.islands.find((entry) => entry.id === id - 1)
        ctx.fillStyle = climates.find((climate) => climate.id === island?.climate)?.color ?? '#888'
        ctx.fillRect(offsetX + x * scale, offsetY + y * scale, scale + 0.5, scale + 0.5)
      }
    }

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

    ctx.font = `${Math.round(13 * dpr)}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    for (const placement of state.world.placements) {
      const island = state.islands.find((entry) => entry.id === placement.id)
      if (!island) continue
      const x = offsetX + (placement.x + placement.w / 2) * scale
      const y = offsetY + (placement.y + placement.h / 2) * scale
      if (island.id === activeIsland) {
        ctx.strokeStyle = '#ffd23f'
        ctx.lineWidth = 3 * dpr
        ctx.strokeRect(offsetX + placement.x * scale, offsetY + placement.y * scale, placement.w * scale, placement.h * scale)
      }
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
      const label = island.owned ? island.name : `${island.name} (${island.role === 'trader' ? 'Händler' : 'frei'})`
      const labelWidth = ctx.measureText(label).width + 10 * dpr
      ctx.fillRect(x - labelWidth / 2, y - 10 * dpr, labelWidth, 20 * dpr)
      ctx.fillStyle = '#ffffff'
      ctx.fillText(label, x, y + 5 * dpr)
    }
  }, [state.world, state.islands, state.ships, activeIsland, width, height, cells])

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
          <strong>Weltkarte</strong>
          <button type="button" className="panel-close" onClick={onClose} aria-label="Schließen">
            ×
          </button>
        </div>
        <canvas ref={canvasRef} className="world-canvas" onPointerUp={choose} />
      </div>
    </div>
  )
}
