import { getBuilding } from '../data'
import type { BuildingCost } from '../data'
import type { BuildController, ToolSnapshot } from '../game/buildController'
import { demolishPreview, missingResource } from '../sim/build'
import type { IslandState } from '../sim/state'
import { LostSupply } from './BuildingPanel'
import { Cost } from './Icon'
import { resourceName } from './messages'
import { t } from '../i18n/language'

function scale(cost: BuildingCost, times: number): BuildingCost {
  return {
    coins: cost.coins * times,
    tools: cost.tools * times,
    wood: cost.wood * times,
    bricks: cost.bricks * times,
    marble: cost.marble * times,
  }
}

/** Bar for demolishing and for road building (planned route or freehand). */
export function DrawBar({ tool, snapshot, state }: { tool: BuildController; snapshot: ToolSnapshot; state: IslandState }) {
  if (snapshot.mode === 'demolish') {
    const preview = demolishPreview(state, snapshot.stroke)
    const marked = preview.buildings.length + preview.roads
    const parts = [
      preview.buildings.length > 0 ? `${preview.buildings.length} ${t('Gebäude', 'buildings')}` : '',
      preview.roads > 0 ? t(`${preview.roads} Straßenstück${preview.roads === 1 ? '' : 'e'}`, `${preview.roads} road ${preview.roads === 1 ? 'piece' : 'pieces'}`) : '',
    ].filter(Boolean)
    return (
      <div className="place-bar">
        <div className="place-info">
          <strong>{t('Abriss', 'Demolish')}</strong>
          <span className="place-cost">
            {marked > 0 ? (
              <>
                {parts.join(', ')} · {t('zurück', 'refund')}: <Cost cost={preview.refund} />
              </>
            ) : (
              t('50 % der Baukosten zurück', '50 % of the building cost back')
            )}
          </span>
          <LostSupply state={state} ids={preview.buildings} />
          <span className="place-hint">
            {marked > 0
              ? t('Weitere antippen oder darüberziehen, dann „Abreißen“. Zwei Finger bewegen die Karte.', 'Tap or drag over more, then "Demolish". Two fingers move the map.')
              : t('Gebäude oder Straßen antippen oder darüberziehen, um sie zu markieren. Zwei Finger bewegen die Karte.', 'Tap or drag over buildings or roads to mark them. Two fingers move the map.')}
          </span>
        </div>
        <div className="place-actions">
          {snapshot.stroke.length > 0 && (
            <button type="button" className="action-button" onClick={() => tool.clearStroke()}>
              {t('Auswahl leeren', 'Clear selection')}
            </button>
          )}
          <button type="button" className="action-button danger" disabled={marked === 0} onClick={() => tool.confirmDemolish()}>
            {t('Abreißen', 'Demolish')}
          </button>
          <button type="button" className="action-button" onClick={() => tool.cancel()}>
            {t('Fertig', 'Done')}
          </button>
        </div>
      </div>
    )
  }

  const roadCost = getBuilding('road').cost
  const { route, freehand } = snapshot
  const count = route.plan?.newTiles.length ?? 0
  const total = scale(roadCost, count)
  const missing = count > 0 ? missingResource(state, total) : null

  let hint: string
  if (freehand) hint = t('Mit dem Finger ziehen, um Straßen zu bauen. Zwei Finger bewegen die Karte.', 'Drag with your finger to build roads. Two fingers move the map.')
  else if (!route.start) hint = t('Startpunkt antippen (Gebäude oder freie Kachel).', 'Tap the start point (a building or a free tile).')
  else if (!route.end) hint = t('Zielpunkt antippen. Das Spiel schlägt die beste Route vor.', 'Tap the target point. The game proposes the best route.')
  else if (count === 0) hint = t('Diese Strecke ist schon gebaut. Ziel neu antippen oder die Route ziehen.', 'This stretch is already built. Tap a new target or drag the route.')
  else hint = t('Route ziehen, um sie zu verbiegen. Antippen verschiebt den näheren Punkt (A oder B). Dann „Bauen“.', 'Drag the route to bend it. Tapping moves the closer end (A or B). Then "Build".')

  return (
    <div className="place-bar">
      <div className="place-info">
        <strong>{freehand ? t('Straße frei zeichnen', 'Draw road freehand') : t('Straße planen', 'Plan road')}</strong>
        <span className="place-cost">
          {freehand || !route.plan ? (
            <>
              <Cost cost={roadCost} /> {t('pro Kachel', 'per tile')}
            </>
          ) : (
            <>
              {count} {t('neue Kacheln', 'new tiles')} <Cost cost={total} />
            </>
          )}
        </span>
        <span className={missing ? 'place-hint invalid' : 'place-hint'}>
          {missing ? `${t('Es fehlt', 'Missing')}: ${resourceName(missing)}` : hint}
        </span>
      </div>
      <div className="place-actions">
        <button type="button" className="action-button" onClick={() => tool.setFreehand(!freehand)}>
          {freehand ? t('Route planen', 'Plan route') : t('Frei zeichnen', 'Draw freehand')}
        </button>
        {!freehand && route.start && (
          <button type="button" className="action-button" onClick={() => tool.routeClear()}>
            {t('Neu', 'New')}
          </button>
        )}
        {!freehand && route.via.length > 0 && (
          <button type="button" className="action-button" onClick={() => tool.routeReset()}>
            {t('Beste Route', 'Best route')}
          </button>
        )}
        {!freehand && route.plan && (
          <button type="button" className="action-button confirm" disabled={count === 0 || missing !== null} onClick={() => tool.routeConfirm()}>
            {t('Bauen', 'Build')}
          </button>
        )}
        <button type="button" className="action-button" onClick={() => tool.cancel()}>
          {t('Fertig', 'Done')}
        </button>
      </div>
    </div>
  )
}
