import { useState } from 'react'
import { getBuilding, tiers } from '../data'
import type { BuildController } from '../game/buildController'
import { builtCount, chainSeparator, chainsFor, MATERIALS, needsByTier, supplyOf, type ChainRole, type NeedTile } from '../game/needsOverview'
import type { IslandState } from '../sim/state'
import { BuildItem } from './BuildItem'
import { Icon } from './Icon'
import { formatWhole, resourceName } from './messages'
import { t } from '../i18n/language'

interface Selection {
  good: string
  /** Who asks for it, e.g. "Pioniere"; empty for building materials. */
  tierId: string | null
  need: NeedTile | null
}

const roleLabel = (role: ChainRole): string =>
  role === 'alternative' ? t('oder stattdessen', 'or instead') : role === 'substitute' ? t('Notlösung, wenn es fehlt', 'fallback when it is missing') : ''

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
      <section className="build-group">
        <h3 className="build-group-title">{t('Baumaterial', 'Building materials')}</h3>
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
      {needsByTier(state).map((tier) => (
        <section key={tier.tierId} className={tier.locked ? 'build-group locked' : 'build-group'}>
          <h3 className="build-group-title">
            <Icon name={`tiers/${tier.tierId}`} size={18} /> {t(`${tier.name} brauchen`, `${tier.name} need`)}
            {tier.locked && <span className="build-group-users"> · {t('noch nicht erreicht', 'not reached yet')}</span>}
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
                  <span className="need-tile-state">{need.optional ? t('Bonus', 'Bonus') : supply === null ? '–' : `${Math.round(supply)} %`}</span>
                </button>
              )
            })}
          </div>
        </section>
      ))}
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
          ‹ {t('Übersicht', 'Overview')}
        </button>
        <Icon name={`goods/${good}`} size={28} />
        <span className="chain-head-text">
          <strong>{resourceName(good)}</strong>
          {tier ? t(` für ${tier.name}`, ` for ${tier.name}`) : t(' (Baumaterial)', ' (building material)')} · {t('im Lager', 'in store')} {formatWhole(state.stock[good] ?? 0)} t
          {supply !== null && t(` · versorgt ${Math.round(supply)} %`, ` · supplied ${Math.round(supply)} %`)}
          {need?.optional && t(' · Bonus: bringt mehr Steuer', ' · bonus: brings more tax')}
        </span>
      </div>
      <div className="build-items">
        {found.map(({ chain, role }) => (
          <section key={chain.id} className="build-group">
            <h3 className="build-group-title">
              {chain.name}
              {role !== 'main' && <span className="build-group-users"> · {roleLabel(role)}</span>}
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
