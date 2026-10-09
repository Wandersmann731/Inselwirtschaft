import { getBuilding } from '../data'
import type { BuildingCost } from '../data'
import type { BuildController, ToolSnapshot } from '../game/buildController'
import { missingResource } from '../sim/build'
import type { IslandState } from '../sim/state'
import { Cost } from './Icon'
import { resourceName } from './messages'

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
    return (
      <div className="place-bar">
        <div className="place-info">
          <strong>Abriss</strong>
          <span className="place-cost">50 % der Baukosten zurück</span>
          <span className="place-hint">Gebäude oder Straße antippen oder darüber ziehen</span>
        </div>
        <div className="place-actions">
          <button type="button" className="action-button" onClick={() => tool.cancel()}>
            Fertig
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
  if (freehand) hint = 'Mit dem Finger ziehen, um Straßen zu bauen. Zwei Finger bewegen die Karte.'
  else if (!route.start) hint = 'Startpunkt antippen (Gebäude oder freie Kachel).'
  else if (!route.end) hint = 'Zielpunkt antippen. Das Spiel schlägt die beste Route vor.'
  else if (count === 0) hint = 'Diese Strecke ist schon gebaut. Ziel neu antippen oder die Route ziehen.'
  else hint = 'Route ziehen, um sie zu verbiegen. Ziel antippen verschiebt B. Dann „Bauen“.'

  return (
    <div className="place-bar">
      <div className="place-info">
        <strong>{freehand ? 'Straße frei zeichnen' : 'Straße planen'}</strong>
        <span className="place-cost">
          {freehand || !route.plan ? (
            <>
              <Cost cost={roadCost} /> pro Kachel
            </>
          ) : (
            <>
              {count} neue Kacheln <Cost cost={total} />
            </>
          )}
        </span>
        <span className={missing ? 'place-hint invalid' : 'place-hint'}>
          {missing ? `Es fehlt: ${missing === 'coins' ? 'Münzen' : resourceName(missing)}` : hint}
        </span>
      </div>
      <div className="place-actions">
        <button type="button" className="action-button" onClick={() => tool.setFreehand(!freehand)}>
          {freehand ? 'Route planen' : 'Frei zeichnen'}
        </button>
        {!freehand && route.start && (
          <button type="button" className="action-button" onClick={() => tool.routeClear()}>
            Neu
          </button>
        )}
        {!freehand && route.via.length > 0 && (
          <button type="button" className="action-button" onClick={() => tool.routeReset()}>
            Beste Route
          </button>
        )}
        {!freehand && route.plan && (
          <button type="button" className="action-button confirm" disabled={count === 0 || missing !== null} onClick={() => tool.routeConfirm()}>
            Bauen
          </button>
        )}
        <button type="button" className="action-button" onClick={() => tool.cancel()}>
          Fertig
        </button>
      </div>
    </div>
  )
}
