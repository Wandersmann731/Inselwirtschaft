import { useEffect, useRef, useState } from 'react'
import { config, getBuilding, tiers, trade } from '../data'
import type { BuildingCost } from '../data'
import { cumulativeNeeds, getTier } from '../sim/tiers'
import type { BuildController } from '../game/buildController'
import { inputTarget, upkeepOf } from '../sim/production'
import { getLinks } from '../sim/logistics'
import { taxOf } from '../sim/market'
import type { HouseState, IslandState } from '../sim/state'
import { housesLosingSupply } from '../sim/coverage'
import { hubCount, stockCapacity } from '../sim/storage'
import { formatCost, formatWhole, needLabel, resourceName, statusText } from './messages'
import { Icon } from './Icon'
import { STATUS_ICONS } from './statusIcons'
import { t } from '../i18n/language'

/** Info panel of the selected building: state of a producer, buffers, upkeep and the off switch. */
export function BuildingPanel({
  tool,
  state,
  buildingId,
  onOpenKontor,
}: {
  tool: BuildController
  state: IslandState
  buildingId: number
  onOpenKontor: () => void
}) {
  const [confirming, setConfirming] = useState<number | null>(null)
  const confirmRef = useRef<HTMLDivElement>(null)
  // the question may lie below the fold of a small screen: bring it into view
  useEffect(() => {
    if (confirming !== null) confirmRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [confirming])
  const building = state.buildings.find((b) => b.id === buildingId)
  if (!building) return null
  const def = getBuilding(building.type)
  const production = building.production
  const cycleTicks = def.cycleTicks ?? 1
  const link = production ? getLinks(state).get(building.id) : undefined
  // the buffer grows with the road: what is on the way counts as well
  const delay = link?.kind === 'ok' ? link.delay : 0

  return (
    <div className="building-panel">
      <div className="panel-title">
        <strong>{def.name}</strong>
        <button type="button" className="panel-close" onClick={() => tool.selectBuilding(null)} aria-label={t('Schließen', 'Close')}>
          ×
        </button>
      </div>

      {production && (
        <>
          <div className="panel-status">
            <Icon name={STATUS_ICONS[production.status.kind]} size={26} />
            {statusText(production.status)}
          </div>
          <div className="panel-line">{t('Auslastung', 'Utilisation')}: {production.utilization} % {t('(letzter Zyklus)', '(last cycle)')}</div>
          <div className="panel-bar">
            <div className="panel-bar-fill" style={{ width: `${(production.progress / cycleTicks) * 100}%` }} />
          </div>
          {(def.inputs ?? []).map((input) => {
            const goods = [input.good, ...(input.alternatives ?? [])]
            const have =
              goods.reduce((sum, good) => sum + (production.inputs[good] ?? 0), 0) +
              production.shipments.filter((s) => s.kind === 'in' && goods.includes(s.good)).reduce((sum, s) => sum + s.amount, 0)
            const names = goods.map(resourceName).join(' / ')
            return (
              <div key={input.good} className="panel-line">
                {t('Eingang', 'Input')} {names}: {have} / {inputTarget(def, input, delay)}
              </div>
            )
          })}
          {def.output && (
            <div className="panel-line">
              {t('Ausgang', 'Output')} {resourceName(def.output.good)}: {production.output} / {config.production.outputBufferAmount}
            </div>
          )}
          {def.byproducts?.map((extra) => (
            <div key={extra.good} className="panel-line">
              {t('Nebenprodukt', 'Byproduct')} {resourceName(extra.good)}: {Math.floor(production.extra[extra.good] ?? 0)} / {config.production.outputBufferAmount}
            </div>
          ))}
          {production.shipments.length > 0 && (
            <div className="panel-line">{t('Unterwegs', 'On the way')}: {production.shipments.length} {t('Lieferung(en)', 'delivery(ies)')}</div>
          )}
        </>
      )}

      {building.house && <HousePanel house={building.house} stopped={state.upgradeStop ?? []} />}

      <div className="panel-line">
        {t('Unterhalt', 'Upkeep')}: {upkeepOf(building)} {t('Münzen pro Zyklus', 'coins per cycle')}{building.active ? '' : t(' (stillgelegt)', ' (shut down)')}
      </div>
      {def.catchment !== undefined && (
        <div className="panel-line">
          {t('Lager', 'Store')}: {t('bis', 'up to')} {stockCapacity(state)} {t('je Ware', 'per good')} ({hubCount(state)}{' '}
          {hubCount(state) === 1 ? t('Kontor oder Markthaus', 'trading post or market house') : t('Kontore und Markthäuser', 'trading posts and market houses')},{' '}
          {t('jedes weitere gibt mehr Platz', 'each further one gives more room')})
        </div>
      )}
      {(building.type === 'kontor' || building.type === 'market_house') && <UpgradeStops tool={tool} state={state} />}
      {building.type === 'kontor' && (
        <button type="button" className="action-button panel-toggle" onClick={onOpenKontor}>
          {t('Handel einstellen', 'Set up trade')}
        </button>
      )}
      {building.type === 'shipyard' && (
        <button type="button" className="action-button panel-toggle" onClick={() => tool.buildShip()}>
          {t('Schiff bauen', 'Build ship')} ({formatCost(trade.ship.cost)})
        </button>
      )}
      {building.type !== 'kontor' &&
        (confirming === building.id ? (
          <div className="panel-confirm" ref={confirmRef}>
            <span>{t('Abreißen? Zurück', 'Demolish? You get back')}: {formatCost(refundOf(def.cost))}</span>
            <LostSupply state={state} ids={[building.id]} />
            <button type="button" className="action-button danger" onClick={() => tool.demolish(building.id)}>
              {t('Ja, abreißen', 'Yes, demolish')}
            </button>
            <button type="button" className="action-button" onClick={() => setConfirming(null)}>
              {t('Nein', 'No')}
            </button>
          </div>
        ) : (
          <button type="button" className="action-button panel-toggle" onClick={() => setConfirming(building.id)}>
            {t('Abreißen', 'Demolish')}
          </button>
        ))}
      {!building.house && (
        <button
          type="button"
          className="action-button panel-toggle"
          onClick={() => tool.setActive(building.id, !building.active)}
        >
          {building.active ? t('Stilllegen', 'Shut down') : t('Wieder starten', 'Restart')}
        </button>
      )}
    </div>
  )
}

function HousePanel({ house, stopped }: { house: NonNullable<IslandState['buildings'][number]['house']>; stopped: string[] }) {
  const tier = getTier(house.tier)
  const next = tiers[tiers.indexOf(tier) + 1]
  const stoppedNext = next !== undefined && stopped.includes(next.id)
  if (house.ruin) {
    return <div className="panel-status">{t('Ruine: Die Aristokraten sind ausgezogen. Nur Abriss hilft.', 'Ruin: the aristocrats have left. Only demolishing helps.')}</div>
  }
  return (
    <>
      <div className="panel-status">
        {tier.name}: {Math.floor(house.residents)} / {tier.residents} {t('Einwohner', 'residents')}
        <span className="mood" title={moodOf(house).text}>
          {moodOf(house).face}
        </span>
      </div>
      <div className="panel-line">{moodOf(house).text}</div>
      {cumulativeNeeds(house.tier).map((need) => {
        const percent = Math.round(house.needs[need.id] ?? 0)
        return (
          <div key={need.id} className="need-row">
            <span className="need-name">
              {needLabel(need)}
              {need.optional && <small> ({t('Bonus', 'bonus')})</small>}
              {need.forRise && <small title={t('Nur für den Aufstieg nötig', 'Only needed to rise')}> ↑</small>}
            </span>
            <span className="panel-bar need-bar">
              <span className="panel-bar-fill" style={{ width: `${percent}%`, background: needColor(percent) }} />
            </span>
            <span className="need-percent">{percent} %</span>
          </div>
        )
      })}
      <div className="panel-line">{t('Steuer', 'Tax')}: {formatWhole(taxOf(house))} {t('Münzen pro Zyklus', 'coins per cycle')}</div>
      {house.missingMaterials && <div className="panel-line invalid">{t('Aufstieg wartet auf Baumaterial', 'Rising waits for building material')}</div>}
      {stoppedNext && <div className="panel-line">{t('Aufstieg im Markthaus gesperrt', 'Rising blocked at the market house')}</div>}
    </>
  )
}

/** At the market house and Kontor: which tiers the houses of this island may rise into. Stopping saves materials. */
function UpgradeStops({ tool, state }: { tool: BuildController; state: IslandState }) {
  const stopped = new Set(state.upgradeStop ?? [])
  const rising = tiers.filter((tier) => tier.upgradeCost)
  return (
    <div className="upgrade-stops">
      <div className="panel-line">
        <strong>{t('Aufstiege', 'Rises')}</strong> {t('(verbrauchen Baumaterial)', '(use up building material)')}
      </div>
      {rising.map((tier) => {
        const blocked = stopped.has(tier.id)
        return (
          <button
            key={tier.id}
            type="button"
            className={blocked ? 'action-button upgrade-stop blocked' : 'action-button upgrade-stop'}
            onClick={() => tool.setUpgradeStop(tier.id, !blocked)}
          >
            <span>
              {blocked ? t('Gesperrt', 'Blocked') : t('Erlaubt', 'Allowed')}: {t('zu', 'to')} {tier.name}
            </span>
            <small>{formatCost(tier.upgradeCost!)} {t('je Haus', 'per house')}</small>
          </button>
        )
      })}
    </div>
  )
}

/** The face of the residents, as in the original house window: unhappy, content or happy. */
function moodOf(house: HouseState): { face: string; text: string } {
  const needs = cumulativeNeeds(house.tier).filter((need) => !need.optional)
  const percent = (id: string): number => house.needs[id] ?? 0
  if (needs.some((need) => !need.forRise && percent(need.id) < config.population.shortageBelow)) {
    return { face: '☹️', text: t('Unzufrieden: Es fehlt etwas Wichtiges, Bewohner ziehen aus.', 'Unhappy: something important is missing, residents are moving out.') }
  }
  if (needs.every((need) => percent(need.id) >= 100)) return { face: '😊', text: t('Glücklich: Alles da, das Haus kann aufsteigen.', 'Happy: everything is there, the house can rise.') }
  return { face: '🙂', text: t('Zufrieden: Sie bleiben, für den Aufstieg fehlt noch etwas.', 'Content: they stay, something is still missing to rise.') }
}

function refundOf(cost: BuildingCost): BuildingCost {
  const back = (value: number): number => Math.floor(value * config.refundRate)
  return { coins: back(cost.coins), tools: back(cost.tools), wood: back(cost.wood), bricks: back(cost.bricks), marble: back(cost.marble) }
}

function needColor(percent: number): string {
  if (percent >= 100) return '#4cd964'
  return percent < config.population.shortageBelow ? '#ff4d4d' : '#ffd23f'
}

/** Warning before demolishing a Kontor or market house: these houses would get no goods any more. */
export function LostSupply({ state, ids }: { state: IslandState; ids: number[] }) {
  const lost = housesLosingSupply(state, ids)
  if (lost.length === 0) return null
  return (
    <span className="place-hint invalid">
      {t('Achtung', 'Warning')}: {lost.length} {lost.length === 1 ? t('Haus bekommt', 'house gets') : t('Häuser bekommen', 'houses get')} {t('danach keine Waren mehr.', 'no goods afterwards.')}
    </span>
  )
}
