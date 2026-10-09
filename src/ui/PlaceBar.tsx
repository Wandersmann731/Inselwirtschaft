import { getBuilding } from '../data'
import type { BuildingCost } from '../data'
import type { BuildController, ToolSnapshot } from '../game/buildController'
import { checkPlacement, footprint } from '../sim/build'
import { suppliedHouses } from '../sim/coverage'
import type { IslandState } from '../sim/state'
import { formatStock, placementMessage } from './messages'
import { Cost } from './Icon'

interface PlaceBarProps {
  tool: BuildController
  snapshot: ToolSnapshot
  state: IslandState
}

function scaleCost(cost: BuildingCost, times: number): BuildingCost {
  return { coins: cost.coins * times, tools: cost.tools * times, wood: cost.wood * times, bricks: cost.bricks * times, marble: cost.marble * times }
}

export function PlaceBar({ tool, snapshot, state }: PlaceBarProps) {
  const { typeId, origin, rotated, areaMode, area } = snapshot
  if (!typeId) return null
  const def = getBuilding(typeId)
  const error = origin ? checkPlacement(state, typeId, origin.x, origin.y, rotated) : null
  const canBuild = areaMode ? (area?.origins.length ?? 0) > 0 : origin !== null && error === null
  const square = def.size[0] === def.size[1]

  let hint = 'Tippe auf die Karte, um die Position zu wählen'
  let hintClass = 'place-hint'
  if (areaMode) {
    const count = area?.origins.length ?? 0
    hint = area === null ? 'Fläche mit dem Finger aufziehen, das Spiel setzt die Häuser' : `${count} ${count === 1 ? 'Haus' : 'Häuser'} geplant${area.outOfMoney ? ' (mehr ist nicht bezahlbar)' : ''}. Neu aufziehen ändert die Fläche.`
    if (area !== null && count === 0) hintClass = 'place-hint invalid'
  } else if (origin) {
    if (error) {
      hint = placementMessage(error)
      hintClass = 'place-hint invalid'
    } else if (def.radius !== undefined) {
      const { w, h } = footprint(def, rotated)
      const count = suppliedHouses(state, { x: origin.x, y: origin.y, w, h }, def.radius).length
      hint = `Radius ${def.radius} Kacheln · versorgt ${count} ${count === 1 ? 'Haus' : 'Häuser'}`
    } else {
      hint = 'Bereit: „Bauen“ oder die Stelle noch einmal antippen'
    }
  }

  return (
    <div className="place-bar">
      <div className="place-info">
        <strong>{def.name}</strong>
        <span className="place-cost">
          {areaMode && area && area.origins.length > 0 ? (
            <Cost cost={scaleCost(def.cost, area.origins.length)} />
          ) : (
            <Cost cost={def.cost} />
          )}{' '}
          · Vorrat: {formatStock(state)}
        </span>
        <span className={hintClass}>{hint}</span>
      </div>
      <div className="place-actions">
        {def.houseTier && (
          <button type="button" className={areaMode ? 'action-button active' : 'action-button'} onClick={() => tool.setAreaMode(!areaMode)}>
            Viertel
          </button>
        )}
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
