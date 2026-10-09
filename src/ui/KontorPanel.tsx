import { goods, trade } from '../data'
import type { GameLoop } from '../game/gameLoop'
import { setTradeLimit, traderBuyPrice, traderSellPrice, traderSells } from '../sim/trade'
import type { IslandState } from '../sim/state'
import { formatWhole } from './messages'

const STEP = 10

/** Kontor settings: when the trader calls once per cycle, he sells you goods below your buy limit and buys what is above your sell limit. */
export function KontorPanel({ loop, island, onClose }: { loop: GameLoop; island: IslandState; onClose: () => void }) {
  const change = (good: string, key: 'buyBelow' | 'sellAbove', delta: number): void => {
    loop.dispatchIsland((state) => {
      const current = state.trade[good] ?? {}
      const value = Math.max(0, (current[key] ?? 0) + delta)
      return setTradeLimit(state, good, { ...current, [key]: value })
    })
  }
  const show = (value: number | undefined): string => (value ? formatWhole(value) : 'aus')

  return (
    <div className="stats-backdrop" onClick={onClose}>
      <div className="stats-panel kontor-panel" onClick={(event) => event.stopPropagation()}>
        <div className="panel-title">
          <strong>Kontor: {island.name}</strong>
          <button type="button" className="panel-close" onClick={onClose} aria-label="Schließen">
            ×
          </button>
        </div>
        <p className="stats-note">
          Der Händler kommt einmal pro Zyklus, bis zu {trade.trader.visitCapacity} Tonnen je Ware. Er verkauft dir Ware unter
          deiner Ankaufgrenze und kauft alles über deiner Verkaufsgrenze.
        </p>
        <div className="stats-scroll">
          <table className="stats-table kontor-table">
            <thead>
              <tr>
                <th>Ware</th>
                <th>Lager</th>
                <th>Ankauf bis</th>
                <th>Verkauf ab</th>
              </tr>
            </thead>
            <tbody>
              {goods.map((good) => {
                const limit = island.trade[good.id] ?? {}
                return (
                  <tr key={good.id}>
                    <td>
                      {good.name}
                      <span className="kontor-price">
                        {traderSells(good.id) ? ` kauft ${Math.round(traderSellPrice(good.id))}` : ''} · verkauft{' '}
                        {Math.round(traderBuyPrice(good.id))}
                      </span>
                    </td>
                    <td>{formatWhole(island.stock[good.id] ?? 0)}</td>
                    <td>
                      {traderSells(good.id) ? (
                        <Stepper value={show(limit.buyBelow)} onChange={(d) => change(good.id, 'buyBelow', d)} />
                      ) : (
                        '–'
                      )}
                    </td>
                    <td>
                      <Stepper value={show(limit.sellAbove)} onChange={(d) => change(good.id, 'sellAbove', d)} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Stepper({ value, onChange }: { value: string; onChange: (delta: number) => void }) {
  return (
    <span className="stepper">
      <button type="button" className="step-button" onClick={() => onChange(-STEP)}>
        −
      </button>
      <span className="step-value">{value}</span>
      <button type="button" className="step-button" onClick={() => onChange(STEP)}>
        +
      </button>
    </span>
  )
}
