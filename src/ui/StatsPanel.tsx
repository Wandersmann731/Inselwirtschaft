import { climates, goods, tiers } from '../data'
import { balanceOf } from '../sim/economy'
import type { GameState, IslandState } from '../sim/state'
import { residentsOfTier } from '../sim/tiers'
import { findShortages } from '../sim/warnings'
import { depositName, fertilityName, formatSigned, formatWhole } from './messages'
import { Icon } from './Icon'
import { oneDecimal, t } from '../i18n/language'

/** Statistics window: money of the last cycle, residents per tier and production and use per good on the island on screen. */
export function StatsPanel({ state, island, onClose }: { state: GameState; island: IslandState; onClose: () => void }) {
  const last = island.economy.last
  const warned = new Map(findShortages(island).map((warning) => [warning.good, warning.cycles]))
  const rows = goods.filter(
    (good) =>
      (island.stock[good.id] ?? 0) >= 1 || (last?.produced[good.id] ?? 0) > 0 || (last?.consumed[good.id] ?? 0) > 0,
  )

  return (
    <div className="stats-backdrop" onClick={onClose}>
      <div className="stats-panel" onClick={(event) => event.stopPropagation()}>
        <div className="panel-title">
          <strong>{t('Statistik', 'Statistics')}: {island.name}</strong>
          <button type="button" className="panel-close" onClick={onClose} aria-label={t('Schließen', 'Close')}>
            ×
          </button>
        </div>

        <div className="stats-scroll">
          <h3>{t('Insel', 'Island')}</h3>
          <p className="stats-note">
            {climates.find((climate) => climate.id === island.climate)?.name ?? island.climate}. {t('Land', 'Land')}:{' '}
            {island.fertilities.length > 0 ? island.fertilities.map(fertilityName).join(', ') : t('keines', 'none')}. {t('Vorkommen', 'Deposits')}:{' '}
            {island.deposits.map(depositName).join(', ')}.
          </p>

          <h3>{t('Letzter Zyklus dieser Insel', 'Last cycle of this island')}</h3>
          {last ? (
            <table className="stats-table">
              <tbody>
                <tr>
                  <td>{t('Einnahmen (Steuer)', 'Income (tax)')}</td>
                  <td>{formatSigned(last.income)}</td>
                </tr>
                <tr>
                  <td>{t('Betriebskosten', 'Upkeep')}</td>
                  <td>{formatSigned(-last.upkeep)}</td>
                </tr>
                <tr className="stats-sum">
                  <td>{t('Bilanz', 'Balance')}</td>
                  <td className={balanceOf(last) >= 0 ? 'positive' : 'negative'}>{formatSigned(balanceOf(last))}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p className="stats-note">{t('Die Zahlen erscheinen nach dem ersten Wirtschaftszyklus (60 Ticks).', 'The numbers appear after the first economy cycle (60 ticks).')}</p>
          )}

          <h3>{t('Einwohner (alle Inseln)', 'Residents (all islands)')}</h3>
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

          <h3>{t('Waren pro Zyklus', 'Goods per cycle')}</h3>
          <table className="stats-table">
            <thead>
              <tr>
                <th>{t('Ware', 'Good')}</th>
                <th>{t('Lager', 'Store')}</th>
                <th>{t('Erzeugt', 'Made')}</th>
                <th>{t('Verbraucht', 'Used')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((good) => (
                <tr key={good.id} className={warned.has(good.id) ? 'warned' : undefined}>
                  <td>
                    <Icon name={`goods/${good.id}`} size={22} /> {good.name}
                  </td>
                  <td>{formatWhole(island.stock[good.id] ?? 0)}</td>
                  <td>{oneDecimal(last?.produced[good.id] ?? 0)}</td>
                  <td>{oneDecimal(last?.consumed[good.id] ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="stats-note">{t('Rot: Der Vorrat reicht weniger als 3 Zyklen.', 'Red: the store lasts less than 3 cycles.')}</p>
        </div>
      </div>
    </div>
  )
}
