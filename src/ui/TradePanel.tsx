import { useState } from 'react'
import { goods, trade } from '../data'
import type { GameLoop } from '../game/gameLoop'
import { addOrder, addStop, createRoute, deleteRoute, removeOrder, removeStop } from '../sim/routes'
import { assignRoute, cargoTotal, colonyBlocker, foundColony, loadKit, sendShip, unloadAll } from '../sim/ships'
import type { GameState, Route, Ship } from '../sim/state'
import { kontorKit } from '../sim/trade'
import { formatWhole, resourceName } from './messages'

type Tab = 'ships' | 'routes'

const BLOCKER_TEXT = {
  notDocked: 'Das Schiff ist unterwegs',
  notFree: 'Hier kann keine Kolonie gegründet werden',
  noKit: 'Es fehlt das Baumaterial an Bord (Kontor-Set laden)',
  noCoins: 'Es fehlen Münzen für das Kontor',
  noSpot: 'An der Küste ist kein Platz für ein Kontor',
} as const

function amountLabel(amount: number): string {
  return amount >= trade.orderAmounts[trade.orderAmounts.length - 1] ? 'alle' : `${amount} t`
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
          <strong>Handel</strong>
          <button type="button" className="panel-close" onClick={onClose} aria-label="Schließen">
            ×
          </button>
        </div>
        <div className="tab-row">
          <button type="button" className={tab === 'ships' ? 'category-button active' : 'category-button'} onClick={() => setTab('ships')}>
            Schiffe ({state.ships.length})
          </button>
          <button type="button" className={tab === 'routes' ? 'category-button active' : 'category-button'} onClick={() => setTab('routes')}>
            Routen ({state.routes.length})
          </button>
        </div>
        <div className="stats-scroll">
          {tab === 'ships' ? (
            <>
              {state.ships.length === 0 && (
                <p className="stats-note">
                  {hasYard
                    ? 'Noch kein Schiff. Tippe die Werft auf der Insel an und baue eines.'
                    : 'Du brauchst eine Werft an der Küste, um Schiffe zu bauen (ab Siedlern).'}
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
            ? `Im Hafen: ${islandName(ship.island)}`
            : `Unterwegs nach ${islandName(ship.destination)} (noch ${Math.ceil(remainingCells(ship) / trade.ship.speed)} Ticks)`}
        </span>
      </div>
      <div className="stats-note">
        Ladung {formatWhole(cargoTotal(ship))} / {ship.capacity} t
        {cargo.length > 0 && `: ${cargo.map(([good, amount]) => `${resourceName(good)} ${formatWhole(amount)}`).join(', ')}`}
        {route && ` · Route: ${route.name}`}
      </div>
      {docked && (
        <div className="ship-actions">
          <select value={target} onChange={(event) => setTarget(Number(event.target.value))}>
            <option value={-1}>Fahrt zu …</option>
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
            Los
          </button>
          {route ? (
            <button type="button" className="action-button" onClick={() => loop.dispatch((s) => assignRoute(s, ship.id, null))}>
              Route beenden
            </button>
          ) : (
            <>
              <select value={routeId} onChange={(event) => setRouteId(Number(event.target.value))}>
                {state.routes.length === 0 && <option value={-1}>Keine Route</option>}
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
                Route starten
              </button>
            </>
          )}
          {here?.owned && (
            <>
              <button type="button" className="action-button" onClick={() => loop.dispatch((s) => unloadAll(s, ship.id))}>
                Entladen
              </button>
              <button type="button" className="action-button" onClick={() => loop.dispatch((s) => loadKit(s, ship.id))}>
                Kontor-Set laden
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
              Kontor gründen ({formatWhole(kit.coins)} Münzen)
            </button>
          )}
        </div>
      )}
      {docked && blocker && here && !here.owned && here.role === 'colony' && (
        <div className="place-hint invalid">{BLOCKER_TEXT[blocker]}</div>
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
        Neue Route
      </button>
      {state.routes.length === 0 && (
        <p className="stats-note">
          Eine Route ist eine Liste von Häfen mit Lade- und Entladebefehlen. Das Schiff fährt sie der Reihe nach immer wieder ab.
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
          Route löschen
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
          Halt hinzufügen
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
            {order.mode === 'load' ? 'Laden' : 'Entladen'}: {resourceName(order.good)} {amountLabel(order.amount)}
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
          <option value="load">Laden</option>
          <option value="unload">Entladen</option>
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
          Befehl hinzufügen
        </button>
      </div>
    </div>
  )
}

