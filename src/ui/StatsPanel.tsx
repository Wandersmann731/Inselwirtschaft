import { goods, tiers } from '../data'
import { balanceOf } from '../sim/economy'
import type { GameState } from '../sim/state'
import { residentsOfTier } from '../sim/tiers'
import { findShortages } from '../sim/warnings'
import { formatSigned, formatWhole } from './messages'

const oneDecimal = (value: number): string => value.toFixed(1).replace('.', ',')

/** Statistics window: money of the last cycle, residents per tier and production and use per good. */
export function StatsPanel({ state, onClose }: { state: GameState; onClose: () => void }) {
  const last = state.economy.last
  const warned = new Map(findShortages(state).map((warning) => [warning.good, warning.cycles]))
  const rows = goods.filter(
    (good) =>
      (state.stock[good.id] ?? 0) >= 1 || (last?.produced[good.id] ?? 0) > 0 || (last?.consumed[good.id] ?? 0) > 0,
  )

  return (
    <div className="stats-backdrop" onClick={onClose}>
      <div className="stats-panel" onClick={(event) => event.stopPropagation()}>
        <div className="panel-title">
          <strong>Statistik</strong>
          <button type="button" className="panel-close" onClick={onClose} aria-label="Schließen">
            ×
          </button>
        </div>

        <div className="stats-scroll">
          <h3>Letzter Zyklus</h3>
          {last ? (
            <table className="stats-table">
              <tbody>
                <tr>
                  <td>Einnahmen (Marktstände)</td>
                  <td>{formatSigned(last.income)}</td>
                </tr>
                <tr>
                  <td>Betriebskosten</td>
                  <td>{formatSigned(-last.upkeep)}</td>
                </tr>
                <tr className="stats-sum">
                  <td>Bilanz</td>
                  <td className={balanceOf(last) >= 0 ? 'positive' : 'negative'}>{formatSigned(balanceOf(last))}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p className="stats-note">Die Zahlen erscheinen nach dem ersten Wirtschaftszyklus (60 Ticks).</p>
          )}

          <h3>Einwohner</h3>
          <table className="stats-table">
            <tbody>
              {tiers.map((tier) => (
                <tr key={tier.id}>
                  <td>{tier.name}</td>
                  <td>{formatWhole(residentsOfTier(state, tier.id))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Waren pro Zyklus</h3>
          <table className="stats-table">
            <thead>
              <tr>
                <th>Ware</th>
                <th>Lager</th>
                <th>Erzeugt</th>
                <th>Verbraucht</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((good) => (
                <tr key={good.id} className={warned.has(good.id) ? 'warned' : undefined}>
                  <td>{good.name}</td>
                  <td>{formatWhole(state.stock[good.id] ?? 0)}</td>
                  <td>{oneDecimal(last?.produced[good.id] ?? 0)}</td>
                  <td>{oneDecimal(last?.consumed[good.id] ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="stats-note">Rot: Der Vorrat reicht weniger als 3 Zyklen.</p>
        </div>
      </div>
    </div>
  )
}
