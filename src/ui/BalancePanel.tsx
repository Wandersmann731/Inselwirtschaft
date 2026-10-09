import { useState } from 'react'
import { config, goods } from '../data'
import type { GameLoop } from '../game/gameLoop'
import { formatSigned, formatWhole } from './messages'
import { useSyncExternalStore } from 'react'

const JUMP_CYCLES = [1, 5, 20]

/** Debug window for balancing: fast forward, extra money and goods, and a table of the last economy cycles. */
export function BalancePanel({ loop, onClose }: { loop: GameLoop; onClose: () => void }) {
  const { state, activeIsland } = useSyncExternalStore(loop.subscribe, loop.getView)
  const [, redraw] = useState(0)
  const history = loop.getHistory()
  const rows = history.slice(-14).reverse()

  const addGoods = (amount: number): void => {
    loop.dispatchIsland((island) => {
      const stock = { ...island.stock }
      for (const good of goods) stock[good.id] = (stock[good.id] ?? 0) + amount
      return { ...island, stock }
    })
  }

  return (
    <div className="stats-backdrop" onClick={onClose}>
      <div className="stats-panel balance-panel" onClick={(event) => event.stopPropagation()}>
        <div className="panel-title">
          <strong>Balancing</strong>
          <button type="button" className="panel-close" onClick={onClose} aria-label="Schließen">
            ×
          </button>
        </div>
        <div className="stats-scroll">
          <h3>Schneller Vorlauf</h3>
          <div className="ship-actions">
            {config.debugSpeeds.map((speed) => (
              <button key={speed} type="button" className={speed === state.speed ? 'category-button active' : 'category-button'} onClick={() => loop.setSpeed(speed)}>
                {speed}x
              </button>
            ))}
            {JUMP_CYCLES.map((cycles) => (
              <button
                key={cycles}
                type="button"
                className="action-button"
                onClick={() => {
                  loop.fastForward(cycles * config.economyCycleTicks)
                  redraw((value) => value + 1)
                }}
              >
                +{cycles} {cycles === 1 ? 'Zyklus' : 'Zyklen'} sofort
              </button>
            ))}
          </div>
          <h3>Hilfen (Insel: {state.islands.find((island) => island.id === activeIsland)?.name})</h3>
          <div className="ship-actions">
            <button type="button" className="action-button" onClick={() => loop.dispatch((s) => ({ ...s, coins: s.coins + 10000 }))}>
              +10.000 Münzen
            </button>
            <button type="button" className="action-button" onClick={() => addGoods(100)}>
              +100 von jeder Ware
            </button>
            <button type="button" className="action-button" onClick={() => loop.dispatch((s) => ({ ...s, highestTier: 4 }))}>
              Alle Stufen freischalten
            </button>
          </div>
          <h3>Die letzten Zyklen</h3>
          {rows.length === 0 ? (
            <p className="stats-note">Noch kein Zyklus beendet. Starte die Zeit oder springe vor.</p>
          ) : (
            <table className="stats-table">
              <thead>
                <tr>
                  <th>Zyklus</th>
                  <th>Münzen</th>
                  <th>Bilanz</th>
                  <th>Einnahmen</th>
                  <th>Einwohner</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.cycle}>
                    <td>{row.cycle}</td>
                    <td>{formatWhole(row.coins)}</td>
                    <td className={row.balance >= 0 ? 'positive' : 'negative'}>{formatSigned(row.balance)}</td>
                    <td>{formatWhole(row.income)}</td>
                    <td>{formatWhole(row.residents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="stats-note">Alle Werte lassen sich in src/data/*.json ändern, ohne Programmierung.</p>
        </div>
      </div>
    </div>
  )
}
