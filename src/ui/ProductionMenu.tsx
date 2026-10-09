import { useState } from 'react'
import { getBuilding, tiers } from '../data'
import type { BuildController } from '../game/buildController'
import { builtCount, chainSeparator, chainsFor, MATERIALS, needsByTier, supplyOf, type ChainRole, type NeedTile } from '../game/needsOverview'
import type { IslandState } from '../sim/state'
import { BuildItem } from './BuildItem'
import { Icon } from './Icon'
import { formatWhole, resourceName } from './messages'

interface Selection {
  good: string
  /** Who asks for it, e.g. "Pioniere"; empty for building materials. */
  tierId: string | null
  need: NeedTile | null
}

const ROLE_LABEL: Record<ChainRole, string> = {
  main: '',
  alternative: 'oder stattdessen',
  substitute: 'Notlösung, wenn es fehlt',
}

function supplyClass(percent: number | null): string {
  if (percent === null) return 'need-tile'
  if (percent >= 99.5) return 'need-tile ok'
  return percent >= 50 ? 'need-tile short' : 'need-tile missing'
}

/**
 * Production as "who needs what": first the goods each tier asks for (with how well they are supplied) and the
 * building materials; tapping one shows the chains that make it, step by step, with the buildings to place.
 */
export function ProductionMenu({ tool, state }: { tool: BuildController; state: IslandState }) {
  const [selected, setSelected] = useState<Selection | null>(null)
  if (selected) return <ChainView tool={tool} state={state} selection={selected} onBack={() => setSelected(null)} />

  return (
    <div className="build-items need-overview">
      {needsByTier(state).map((tier) => (
        <section key={tier.tierId} className={tier.locked ? 'build-group locked' : 'build-group'}>
          <h3 className="build-group-title">
            <Icon name={`tiers/${tier.tierId}`} size={18} /> {tier.name} brauchen{tier.locked && <span className="build-group-users"> · noch nicht erreicht</span>}
          </h3>
          <div className="build-group-row">
            {tier.goods.map((need) => {
              const supply = tier.locked ? null : supplyOf(state, need.needId)
              return (
                <button
                  key={need.needId}
                  type="button"
                  className={supplyClass(supply)}
                  onClick={() => setSelected({ good: need.good, tierId: tier.tierId, need })}
                >
                  <Icon name={`goods/${need.good}`} size={34} />
                  <span className="need-tile-name">{resourceName(need.good)}</span>
                  <span className="need-tile-state">{need.optional ? 'Bonus' : supply === null ? '–' : `${Math.round(supply)} %`}</span>
                </button>
              )
            })}
          </div>
        </section>
      ))}
      <section className="build-group">
        <h3 className="build-group-title">Baumaterial</h3>
        <div className="build-group-row">
          {MATERIALS.map((good) => (
            <button key={good} type="button" className="need-tile" onClick={() => setSelected({ good, tierId: null, need: null })}>
              <Icon name={`goods/${good}`} size={34} />
              <span className="need-tile-name">{resourceName(good)}</span>
              <span className="need-tile-state">{formatWhole(state.stock[good] ?? 0)} t</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function ChainView({ tool, state, selection, onBack }: { tool: BuildController; state: IslandState; selection: Selection; onBack: () => void }) {
  const { good, tierId, need } = selection
  const found = chainsFor(good, need?.alternatives, need?.substitutes)
  const tier = tiers.find((entry) => entry.id === tierId)
  const supply = need ? supplyOf(state, need.needId) : null
  return (
    <>
      <div className="chain-head">
        <button type="button" className="tier-tab" onClick={onBack}>
          ‹ Übersicht
        </button>
        <Icon name={`goods/${good}`} size={28} />
        <span className="chain-head-text">
          <strong>{resourceName(good)}</strong>
          {tier ? ` für ${tier.name}` : ' (Baumaterial)'} · im Lager {formatWhole(state.stock[good] ?? 0)} t
          {supply !== null && ` · versorgt ${Math.round(supply)} %`}
          {need?.optional && ' · Bonus: bringt mehr Steuer'}
        </span>
      </div>
      <div className="build-items">
        {found.map(({ chain, role }) => (
          <section key={chain.id} className="build-group">
            <h3 className="build-group-title">
              {chain.name}
              {role !== 'main' && <span className="build-group-users"> · {ROLE_LABEL[role]}</span>}
            </h3>
            <div className="build-group-row">
              {chain.buildings.map((id, index) => (
                <div key={id} className="build-step">
                  {index > 0 && <span className={chainSeparator(chain, index) === 'oder' ? 'chain-arrow word' : 'chain-arrow'}>{chainSeparator(chain, index)}</span>}
                  <BuildItem def={getBuilding(id)} state={state} tool={tool} count={builtCount(state, id)} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}
