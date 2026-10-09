import { getBuilding } from '../data'
import type { BuildController, ToolSnapshot } from '../game/buildController'
import { checkPlacement, footprint } from '../sim/build'
import { suppliedHouses } from '../sim/coverage'
import type { GameState } from '../sim/state'
import { formatCost, formatStock, placementMessage } from './messages'

interface PlaceBarProps {
  tool: BuildController
  snapshot: ToolSnapshot
  state: GameState
}

export function PlaceBar({ tool, snapshot, state }: PlaceBarProps) {
  const { typeId, origin, rotated } = snapshot
  if (!typeId) return null
  const def = getBuilding(typeId)
  const error = origin ? checkPlacement(state, typeId, origin.x, origin.y, rotated) : null
  const canBuild = origin !== null && error === null
  const square = def.size[0] === def.size[1]

  let hint = 'Tippe auf die Karte, um die Position zu wählen'
  let hintClass = 'place-hint'
  if (origin) {
    if (error) {
      hint = placementMessage(error)
      hintClass = 'place-hint invalid'
    } else if (def.radius !== undefined) {
      const { w, h } = footprint(def, rotated)
      const count = suppliedHouses(state, { x: origin.x, y: origin.y, w, h }, def.radius).length
      hint = `Radius ${def.radius} Kacheln · versorgt ${count} ${count === 1 ? 'Haus' : 'Häuser'}`
    } else {
      hint = 'Bereit zum Bauen'
    }
  }

  return (
    <div className="place-bar">
      <div className="place-info">
        <strong>{def.name}</strong>
        <span className="place-cost">
          {formatCost(def.cost)} · Vorrat: {formatStock(state)}
        </span>
        <span className={hintClass}>{hint}</span>
      </div>
      <div className="place-actions">
        {!square && (
          <button type="button" className="action-button" onClick={() => tool.rotate()}>
            Drehen
          </button>
        )}
        <button type="button" className="action-button confirm" disabled={!canBuild} onClick={() => tool.confirm()}>
          Bauen
        </button>
        <button type="button" className="action-button" onClick={() => tool.cancel()}>
          Abbrechen
        </button>
      </div>
    </div>
  )
}
