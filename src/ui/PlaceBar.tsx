import { getBuilding } from '../data'
import type { BuildingCost } from '../data'
import type { BuildController, ToolSnapshot } from '../game/buildController'
import { checkPlacement, footprint } from '../sim/build'
import { hubReaches, suppliedHouses } from '../sim/coverage'
import type { IslandState } from '../sim/state'
import { stockCapacity } from '../sim/storage'
import { formatStock, placementMessage } from './messages'
import { Cost } from './Icon'
import { t } from '../i18n/language'

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

  let hint = t('Tippe auf die Karte, um die Position zu wählen', 'Tap the map to choose the position')
  let hintClass = 'place-hint'
  if (areaMode) {
    const count = area?.origins.length ?? 0
    hint =
      area === null
        ? t('Fläche mit dem Finger aufziehen, das Spiel setzt die Häuser', 'Drag an area with your finger, the game places the houses')
        : t(
            `${count} ${count === 1 ? 'Haus' : 'Häuser'} geplant${area.outOfMoney ? ' (mehr ist nicht bezahlbar)' : ''}. Neu aufziehen ändert die Fläche.`,
            `${count} ${count === 1 ? 'house' : 'houses'} planned${area.outOfMoney ? ' (more is not affordable)' : ''}. Dragging again changes the area.`,
          )
    if (area !== null && count === 0) hintClass = 'place-hint invalid'
  } else if (origin) {
    if (error) {
      hint = placementMessage(error)
      hintClass = 'place-hint invalid'
    } else if (def.radius !== undefined) {
      const { w, h } = footprint(def, rotated)
      const count = suppliedHouses(state, { x: origin.x, y: origin.y, w, h }, def.radius).length
      hint = t(`Radius ${def.radius} Kacheln · versorgt ${count} ${count === 1 ? 'Haus' : 'Häuser'}`, `Radius ${def.radius} tiles · serves ${count} ${count === 1 ? 'house' : 'houses'}`)
    } else if (def.catchment !== undefined) {
      const { w, h } = footprint(def, rotated)
      const count = suppliedHouses(state, { x: origin.x, y: origin.y, w, h }, def.catchment).length
      const extra = stockCapacity({ buildings: [...state.buildings, { id: -1, type: typeId, x: 0, y: 0, rotated: false, active: true }] }) - stockCapacity(state)
      hint = t(
        `Einzugsgebiet ${def.catchment} Kacheln · versorgt ${count} ${count === 1 ? 'Haus' : 'Häuser'}${extra > 0 ? ` · Lager +${extra} je Ware` : ''}`,
        `Catchment ${def.catchment} tiles · serves ${count} ${count === 1 ? 'house' : 'houses'}${extra > 0 ? ` · store +${extra} per good` : ''}`,
      )
    } else if ((def.houseTier || def.output) && !hubReaches(state, { x: origin.x, y: origin.y, ...footprint(def, rotated) })) {
      hint = def.houseTier
        ? t('Außerhalb von Kontor und Markthaus: die Bewohner bekommen keine Waren', 'Outside trading post and market house: the residents get no goods')
        : t('Außerhalb von Kontor und Markthaus: der Betrieb liefert nichts ab', 'Outside trading post and market house: the building delivers nothing')
      hintClass = 'place-hint invalid'
    } else {
      hint = t('Bereit: „Bauen“ oder die Stelle noch einmal antippen', 'Ready: tap "Build" or tap the spot again')
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
          · {t('Vorrat', 'Stock')}: {formatStock(state)}
        </span>
        <span className={hintClass}>{hint}</span>
      </div>
      <div className="place-actions">
        {def.houseTier && (
          <button type="button" className={areaMode ? 'action-button active' : 'action-button'} onClick={() => tool.setAreaMode(!areaMode)}>
            {t('Viertel', 'Quarter')}
          </button>
        )}
        {!square && (
          <button type="button" className="action-button" onClick={() => tool.rotate()}>
            {t('Drehen', 'Rotate')}
          </button>
        )}
        <button type="button" className="action-button confirm" disabled={!canBuild} onClick={() => tool.confirm()}>
          {t('Bauen', 'Build')}
        </button>
        <button type="button" className="action-button" onClick={() => tool.cancel()}>
          {t('Abbrechen', 'Cancel')}
        </button>
      </div>
    </div>
  )
}
