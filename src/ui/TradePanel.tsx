import { useState } from 'react'
import { goods, trade } from '../data'
import type { GameLoop } from '../game/gameLoop'
import { addOrder, addStop, createRoute, deleteRoute, removeOrder, removeStop } from '../sim/routes'
import { assignRoute, cargoTotal, colonyBlocker, foundColony, loadKit, sendShip, unloadAll } from '../sim/ships'
import type { GameState, Route, Ship } from '../sim/state'
import { kontorKit } from '../sim/trade'
import { formatWhole, resourceName } from './messages'
import { t } from '../i18n/language'

type Tab = 'ships' | 'routes'

const BLOCKER_TEXT = {
  notDocked: () => t('Das Schiff ist unterwegs', 'The ship is under way'),
  notFree: () => t('Hier kann keine Kolonie gegründet werden', 'No colony can be founded here'),
  noKit: () => t('Es fehlt das Baumaterial an Bord (Kontor-Set laden)', 'The building material is missing on board (load the trading post kit)'),
  noCoins: () => t('Es fehlen Münzen für das Kontor', 'Not enough coins for the trading post'),
  noSpot: () => t('An der Küste ist kein Platz für ein Kontor', 'No room on the coast for a trading post'),
} as const

function amountLabel(amount: number): string {
  return amount >= trade.orderAmounts[trade.orderAmounts.length - 1] ? t('alle', 'all') : `${amount} t`
}

/** Fleet and trade routes. */
export function TradePanel({ loop, state, onClose }: { loop: GameLoop; state: GameState; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('ships')
  const islandName = (id: number | null): string => state.islands.find((island) => island.id === id)?.name ?? '?'
  const hasYard = state.islands.some(
    (island) => island.owned && island.buildings.some((b) => b.type === 'shipyard' && b.active),
  )

  return (
    <div className="stats-backdrop" onClick={onClose}>
      <div className="stats-panel trade-panel" onClick={(event) => event.stopPropagation()}>
        <div className="panel-title">
          <strong>{t('Handel', 'Trade')}</strong>
          <button type="button" className="panel-close" onClick={onClose} aria-label={t('Schließen', 'Close')}>
            ×
          </button>
        </div>
        <div className="tab-row">
          <button type="button" className={tab === 'ships' ? 'category-button active' : 'category-button'} onClick={() => setTab('ships')}>
            {t('Schiffe', 'Ships')} ({state.ships.length})
          </button>
          <button type="button" className={tab === 'routes' ? 'category-button active' : 'category-button'} onClick={() => setTab('routes')}>
            {t('Routen', 'Routes')} ({state.routes.length})
          </button>
        </div>
        <div className="stats-scroll">
          {tab === 'ships' ? (
            <>
              {state.ships.length === 0 && (
                <p className="stats-note">
                  {hasYard
                    ? t('Noch kein Schiff. Tippe die Werft auf der Insel an und baue eines.', 'No ship yet. Tap the shipyard on the island and build one.')
                    : t('Du brauchst eine Werft an der Küste, um Schiffe zu bauen (ab Siedlern).', 'You need a shipyard on the coast to build ships (from settlers).')}
                </p>
              )}
              {state.ships.map((ship) => (
                <ShipCard key={ship.id} ship={ship} state={state} loop={loop} islandName={islandName} />
              ))}
            </>
          ) : (
            <RoutesTab state={state} loop={loop} islandName={islandName} />
          )}
        </div>
      </div>
    </div>
  )
}

function remainingCells(ship: Ship): number {
  let total = 0
  let { x, y } = ship
  for (const point of ship.path) {
    total += Math.hypot(point.x - x, point.y - y)
    ;({ x, y } = point)
  }
  return total
}

function ShipCard({
  ship,
  state,
  loop,
  islandName,
}: {
  ship: Ship
  state: GameState
  loop: GameLoop
  islandName: (id: number | null) => string
}) {
  const [target, setTarget] = useState<number>(-1)
  const [routeId, setRouteId] = useState<number>(state.routes[0]?.id ?? -1)
  const docked = ship.island !== null
  const here = docked ? state.islands.find((island) => island.id === ship.island) : undefined
  const blocker = docked ? colonyBlocker(state, ship.id) : 'notDocked'
  const route = state.routes.find((entry) => entry.id === ship.routeId)
  const cargo = Object.entries(ship.cargo).filter(([, amount]) => amount > 0)
  const kit = kontorKit()

  return (
    <div className="ship-card">
      <div className="ship-head">
        <strong>{ship.name}</strong>
        <span>
          {docked
            ? t(`Im Hafen: ${islandName(ship.island)}`, `In port: ${islandName(ship.island)}`)
            : t(
                `Unterwegs nach ${islandName(ship.destination)} (noch etwa ${Math.ceil(remainingCells(ship) / trade.ship.speed)} s)`,
                `Sailing to ${islandName(ship.destination)} (about ${Math.ceil(remainingCells(ship) / trade.ship.speed)} s left)`,
              )}
        </span>
      </div>
      <div className="stats-note">
        {t('Ladung', 'Cargo')} {formatWhole(cargoTotal(ship))} / {ship.capacity} t
        {cargo.length > 0 && `: ${cargo.map(([good, amount]) => `${resourceName(good)} ${formatWhole(amount)}`).join(', ')}`}
        {route && ` · ${t('Route', 'Route')}: ${route.name}`}
      </div>
      {docked && (
        <div className="ship-actions">
          <select value={target} onChange={(event) => setTarget(Number(event.target.value))}>
            <option value={-1}>{t('Fahrt zu …', 'Sail to …')}</option>
            {state.islands
              .filter((island) => island.id !== ship.island)
              .map((island) => (
                <option key={island.id} value={island.id}>
                  {island.name}
                </option>
              ))}
          </select>
          <button
            type="button"
            className="action-button"
            disabled={target < 0}
            onClick={() => loop.dispatch((s) => sendShip(s, ship.id, target))}
          >
            {t('Los', 'Go')}
          </button>
          {route ? (
            <button type="button" className="action-button" onClick={() => loop.dispatch((s) => assignRoute(s, ship.id, null))}>
              {t('Route beenden', 'End route')}
            </button>
          ) : (
            <>
              <select value={routeId} onChange={(event) => setRouteId(Number(event.target.value))}>
                {state.routes.length === 0 && <option value={-1}>{t('Keine Route', 'No route')}</option>}
                {state.routes.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="action-button"
                disabled={routeId < 0}
                onClick={() => loop.dispatch((s) => assignRoute(s, ship.id, routeId))}
              >
                {t('Route starten', 'Start route')}
              </button>
            </>
          )}
          {here?.owned && (
            <>
              <button type="button" className="action-button" onClick={() => loop.dispatch((s) => unloadAll(s, ship.id))}>
                {t('Entladen', 'Unload')}
              </button>
              <button type="button" className="action-button" onClick={() => loop.dispatch((s) => loadKit(s, ship.id))}>
                {t('Kontor-Set laden', 'Load trading post kit')}
              </button>
            </>
          )}
          {here && !here.owned && here.role === 'colony' && (
            <button
              type="button"
              className="action-button confirm"
              disabled={blocker !== null}
              onClick={() => loop.dispatch((s) => foundColony(s, ship.id))}
            >
              {t('Kontor gründen', 'Found trading post')} ({formatWhole(kit.coins)} {resourceName('coins')})
            </button>
          )}
        </div>
      )}
      {docked && blocker && here && !here.owned && here.role === 'colony' && (
        <div className="place-hint invalid">{BLOCKER_TEXT[blocker]()}</div>
      )}
    </div>
  )
}

function RoutesTab({
  state,
  loop,
  islandName,
}: {
  state: GameState
  loop: GameLoop
  islandName: (id: number | null) => string
}) {
  return (
    <>
      <button type="button" className="action-button" onClick={() => loop.dispatch((s) => createRoute(s))}>
        {t('Neue Route', 'New route')}
      </button>
      {state.routes.length === 0 && (
        <p className="stats-note">
          {t('Eine Route ist eine Liste von Häfen mit Lade- und Entladebefehlen. Das Schiff fährt sie der Reihe nach immer wieder ab.', 'A route is a list of ports with load and unload orders. The ship sails them in turn, again and again.')}
        </p>
      )}
      {state.routes.map((route) => (
        <RouteEditor key={route.id} route={route} state={state} loop={loop} islandName={islandName} />
      ))}
    </>
  )
}

function RouteEditor({
  route,
  state,
  loop,
  islandName,
}: {
  route: Route
  state: GameState
  loop: GameLoop
  islandName: (id: number | null) => string
}) {
  const [island, setIsland] = useState<number>(state.islands[0].id)
  return (
    <div className="ship-card">
      <div className="ship-head">
        <strong>{route.name}</strong>
        <button type="button" className="action-button" onClick={() => loop.dispatch((s) => deleteRoute(s, route.id))}>
          {t('Route löschen', 'Delete route')}
        </button>
      </div>
      {route.stops.map((stop, stopIndex) => (
        <StopEditor
          key={stopIndex}
          route={route}
          stopIndex={stopIndex}
          title={`${stopIndex + 1}. ${islandName(stop.island)}`}
          loop={loop}
        />
      ))}
      <div className="ship-actions">
        <select value={island} onChange={(event) => setIsland(Number(event.target.value))}>
          {state.islands.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name}
            </option>
          ))}
        </select>
        <button type="button" className="action-button" onClick={() => loop.dispatch((s) => addStop(s, route.id, island))}>
          {t('Halt hinzufügen', 'Add stop')}
        </button>
      </div>
    </div>
  )
}

function StopEditor({ route, stopIndex, title, loop }: { route: Route; stopIndex: number; title: string; loop: GameLoop }) {
  const stop = route.stops[stopIndex]
  const [good, setGood] = useState(goods[0].id)
  const [amount, setAmount] = useState(trade.orderAmounts[1])
  const [mode, setMode] = useState<'load' | 'unload'>('load')
  return (
    <div className="stop-box">
      <div className="ship-head">
        <span>{title}</span>
        <button type="button" className="step-button" onClick={() => loop.dispatch((s) => removeStop(s, route.id, stopIndex))}>
          ×
        </button>
      </div>
      {stop.orders.map((order, orderIndex) => (
        <div key={orderIndex} className="order-row">
          <span>
            {order.mode === 'load' ? t('Laden', 'Load') : t('Entladen', 'Unload')}: {resourceName(order.good)} {amountLabel(order.amount)}
          </span>
          <button
            type="button"
            className="step-button"
            onClick={() => loop.dispatch((s) => removeOrder(s, route.id, stopIndex, orderIndex))}
          >
            ×
          </button>
        </div>
      ))}
      <div className="ship-actions">
        <select value={mode} onChange={(event) => setMode(event.target.value as 'load' | 'unload')}>
          <option value="load">{t('Laden', 'Load')}</option>
          <option value="unload">{t('Entladen', 'Unload')}</option>
        </select>
        <select value={good} onChange={(event) => setGood(event.target.value)}>
          {goods.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name}
            </option>
          ))}
        </select>
        <select value={amount} onChange={(event) => setAmount(Number(event.target.value))}>
          {trade.orderAmounts.map((value) => (
            <option key={value} value={value}>
              {amountLabel(value)}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="action-button"
          onClick={() => loop.dispatch((s) => addOrder(s, route.id, stopIndex, { good, amount, mode }))}
        >
          {t('Befehl hinzufügen', 'Add order')}
        </button>
      </div>
    </div>
  )
}

