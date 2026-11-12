import { useState } from 'react'
import { goods, trade } from '../data'
import type { GameLoop } from '../game/gameLoop'
import { islandName, shipName } from '../i18n/dataNames'
import { t } from '../i18n/language'
import { createTransportRoute } from '../sim/routes'
import { assignRoute } from '../sim/ships'
import type { GameState, Island } from '../sim/state'
import { traderSells } from '../sim/trade'
import { Icon } from './Icon'
import { formatWhole, resourceName } from './messages'

const EVERYTHING = trade.orderAmounts[trade.orderAmounts.length - 1]

const amountLabel = (amount: number): string => (amount >= EVERYTHING ? t('alles', 'all') : `${amount} t`)

/** Islands a ship can trade at: the player's own and the trader. */
const ports = (state: GameState): Island[] => state.islands.filter((island) => island.owned || island.role === 'trader')

function portNote(island: Island): string {
  return island.owned ? t('deine Insel', 'your island') : t('Händler', 'trader')
}

/** Goods that can be loaded at the island: what lies in its store, or what the trader sells. */
function loadable(island: Island): string[] {
  return goods.map((good) => good.id).filter((good) => (island.owned ? (island.stock[good] ?? 0) >= 1 : traderSells(good)))
}

/**
 * A trade route in three steps: where the goods come from, what is carried, where it goes. The route then loads
 * at the first island, unloads everything at the second and sails back, again and again.
 */
export function RouteWizard({ loop, state, onDone }: { loop: GameLoop; state: GameState; onDone: () => void }) {
  const [from, setFrom] = useState<number | null>(null)
  const [good, setGood] = useState<string | null>(null)
  const [amount, setAmount] = useState(trade.orderAmounts[1])
  const [to, setTo] = useState<number | null>(null)
  const idle = state.ships.filter((ship) => ship.island !== null && ship.routeId === null)
  const [shipId, setShipId] = useState<number | null>(idle[0]?.id ?? null)

  const source = state.islands.find((island) => island.id === from)
  const target = state.islands.find((island) => island.id === to)
  const step = from === null ? 1 : good === null ? 2 : 3
  // a ship cannot carry goods from the trader to the trader
  const targets = ports(state).filter((island) => island.id !== from && (island.owned || source?.owned))
  const create = (): void => {
    if (from === null || to === null || good === null) return
    loop.dispatch((current) => {
      const next = createTransportRoute(current, from, to, good, amount)
      const ship = next.ships.find((entry) => entry.id === shipId)
      return next !== current && ship && ship.island !== null && ship.routeId === null ? assignRoute(next, ship.id, current.nextRouteId) : next
    })
    onDone()
  }

  return (
    <div className="ship-card route-wizard">
      <ol className="wizard-steps">
        {[t('Woher?', 'From where?'), t('Was?', 'What?'), t('Wohin?', 'Where to?')].map((label, index) => (
          <li key={label} className={index + 1 === step ? 'current' : index + 1 < step ? 'done' : undefined}>
            <span className="wizard-number">{index + 1 < step ? '✓' : index + 1}</span> {label}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <>
          <p className="stats-note">{t('Wo lädt das Schiff die Waren ein?', 'Where does the ship take the goods on board?')}</p>
          <div className="wizard-options">
            {ports(state).map((island) => (
              <button key={island.id} type="button" className="category-button wizard-option" onClick={() => setFrom(island.id)}>
                <strong>{islandName(island.name)}</strong>
                <span>{portNote(island)}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 2 && source && (
        <>
          <p className="stats-note">
            {source.owned
              ? t(`Welche Ware holt das Schiff auf ${islandName(source.name)} ab?`, `Which good does the ship pick up on ${islandName(source.name)}?`)
              : t('Welche Ware kauft das Schiff beim Händler?', 'Which good does the ship buy from the trader?')}
          </p>
          {loadable(source).length === 0 && <p className="stats-note">{t('Im Lager dieser Insel liegt noch nichts.', 'The store of this island is still empty.')}</p>}
          <div className="wizard-options">
            {loadable(source).map((id) => (
              <button key={id} type="button" className="need-tile" onClick={() => setGood(id)}>
                <Icon name={`goods/${id}`} size={34} />
                <span className="need-tile-name">{resourceName(id)}</span>
                <span className="need-tile-state">{source.owned ? `${formatWhole(source.stock[id] ?? 0)} t` : t('kaufen', 'buy')}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {step === 3 && source && good && (
        <>
          <p className="stats-note">{t('Wie viel je Fahrt, und wo wird entladen?', 'How much per trip, and where is it unloaded?')}</p>
          <div className="wizard-options">
            {trade.orderAmounts.map((value) => (
              <button key={value} type="button" className={value === amount ? 'category-button active' : 'category-button'} onClick={() => setAmount(value)}>
                {amountLabel(value)}
              </button>
            ))}
          </div>
          <div className="wizard-options">
            {targets.map((island) => (
              <button key={island.id} type="button" className={island.id === to ? 'category-button wizard-option active' : 'category-button wizard-option'} onClick={() => setTo(island.id)}>
                <strong>{islandName(island.name)}</strong>
                <span>{island.owned ? portNote(island) : t('Händler: verkaufen', 'trader: sell')}</span>
              </button>
            ))}
          </div>
          {targets.length === 0 && <p className="stats-note">{t('Es gibt noch keine zweite Insel mit Kontor.', 'There is no second island with a trading post yet.')}</p>}
          {idle.length > 0 ? (
            <div className="wizard-options">
              {idle.map((ship) => (
                <button key={ship.id} type="button" className={ship.id === shipId ? 'category-button active' : 'category-button'} onClick={() => setShipId(ship.id === shipId ? null : ship.id)}>
                  ⛵ {shipName(ship.name)}
                </button>
              ))}
            </div>
          ) : (
            <p className="stats-note">{t('Kein freies Schiff im Hafen: Die Route wird angelegt, ein Schiff startest du später unter „Schiffe“.', 'No free ship in port: the route is created; start a ship later under "Ships".')}</p>
          )}
          {target && (
            <p className="wizard-summary">
              <Icon name={`goods/${good}`} size={22} />{' '}
              {t(
                `${islandName(source.name)}: ${amountLabel(amount)} ${resourceName(good)} laden → ${islandName(target.name)}: alles entladen → zurück.`,
                `${islandName(source.name)}: load ${amountLabel(amount)} ${resourceName(good)} → ${islandName(target.name)}: unload everything → back again.`,
              )}
            </p>
          )}
        </>
      )}

      <div className="ship-actions">
        {step > 1 && (
          <button type="button" className="action-button" onClick={() => (step === 3 ? (setGood(null), setTo(null)) : setFrom(null))}>
            ‹ {t('Zurück', 'Back')}
          </button>
        )}
        <button type="button" className="action-button" onClick={onDone}>
          {t('Abbrechen', 'Cancel')}
        </button>
        {step === 3 && (
          <button type="button" className="action-button confirm" disabled={to === null} onClick={create}>
            {shipId !== null && idle.length > 0 ? t('Route anlegen und starten', 'Create and start route') : t('Route anlegen', 'Create route')}
          </button>
        )}
      </div>
    </div>
  )
}
