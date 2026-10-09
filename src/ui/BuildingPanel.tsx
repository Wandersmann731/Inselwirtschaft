import { useEffect, useRef, useState } from 'react'
import { config, getBuilding, trade } from '../data'
import type { BuildingCost } from '../data'
import { cumulativeNeeds, getTier } from '../sim/tiers'
import type { BuildController } from '../game/buildController'
import { upkeepOf } from '../sim/production'
import { taxOf } from '../sim/market'
import type { IslandState } from '../sim/state'
import { formatCost, formatWhole, needLabel, resourceName, statusText } from './messages'
import { Icon } from './Icon'
import { STATUS_ICONS } from './statusIcons'

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

  return (
    <div className="building-panel">
      <div className="panel-title">
        <strong>{def.name}</strong>
        <button type="button" className="panel-close" onClick={() => tool.selectBuilding(null)} aria-label="Schließen">
          ×
        </button>
      </div>

      {production && (
        <>
          <div className="panel-status">
            <Icon name={STATUS_ICONS[production.status.kind]} size={26} />
            {statusText(production.status)}
          </div>
          <div className="panel-line">Auslastung: {production.utilization} % (letzter Zyklus)</div>
          <div className="panel-bar">
            <div className="panel-bar-fill" style={{ width: `${(production.progress / cycleTicks) * 100}%` }} />
          </div>
          {(def.inputs ?? []).map((input) => {
            const goods = [input.good, ...(input.alternatives ?? [])]
            const have = goods.reduce((sum, good) => sum + (production.inputs[good] ?? 0), 0)
            const names = goods.map(resourceName).join(' / ')
            return (
              <div key={input.good} className="panel-line">
                Eingang {names}: {have} / {input.amount * config.production.inputBufferCycles}
              </div>
            )
          })}
          {def.output && (
            <div className="panel-line">
              Ausgang {resourceName(def.output.good)}: {production.output} / {config.production.outputBufferAmount}
            </div>
          )}
          {def.byproducts?.map((extra) => (
            <div key={extra.good} className="panel-line">
              Nebenprodukt {resourceName(extra.good)}: {Math.floor(production.extra[extra.good] ?? 0)} / {config.production.outputBufferAmount}
            </div>
          ))}
          {production.shipments.length > 0 && (
            <div className="panel-line">Unterwegs: {production.shipments.length} Lieferung(en)</div>
          )}
        </>
      )}

      {building.house && <HousePanel house={building.house} />}

      <div className="panel-line">
        Unterhalt: {upkeepOf(building)} Münzen pro Zyklus{building.active ? '' : ' (stillgelegt)'}
      </div>
      {building.type === 'kontor' && (
        <button type="button" className="action-button panel-toggle" onClick={onOpenKontor}>
          Handel einstellen
        </button>
      )}
      {building.type === 'shipyard' && (
        <button type="button" className="action-button panel-toggle" onClick={() => tool.buildShip()}>
          Schiff bauen ({formatCost(trade.ship.cost)})
        </button>
      )}
      {building.type !== 'kontor' &&
        (confirming === building.id ? (
          <div className="panel-confirm" ref={confirmRef}>
            <span>Abreißen? Zurück: {formatCost(refundOf(def.cost))}</span>
            <button type="button" className="action-button danger" onClick={() => tool.demolish(building.id)}>
              Ja, abreißen
            </button>
            <button type="button" className="action-button" onClick={() => setConfirming(null)}>
              Nein
            </button>
          </div>
        ) : (
          <button type="button" className="action-button panel-toggle" onClick={() => setConfirming(building.id)}>
            Abreißen
          </button>
        ))}
      {!building.house && (
        <button
          type="button"
          className="action-button panel-toggle"
          onClick={() => tool.setActive(building.id, !building.active)}
        >
          {building.active ? 'Stilllegen' : 'Wieder starten'}
        </button>
      )}
    </div>
  )
}

function HousePanel({ house }: { house: NonNullable<IslandState['buildings'][number]['house']> }) {
  const tier = getTier(house.tier)
  if (house.ruin) {
    return <div className="panel-status">Ruine: Die Aristokraten sind ausgezogen. Nur Abriss hilft.</div>
  }
  return (
    <>
      <div className="panel-status">
        {tier.name}: {Math.floor(house.residents)} / {tier.residents} Einwohner
      </div>
      {cumulativeNeeds(house.tier).map((need) => {
        const percent = Math.round(house.needs[need.id] ?? 0)
        return (
          <div key={need.id} className="need-row">
            <span className="need-name">
              {needLabel(need)}
              {need.optional && <small> (Bonus)</small>}
            </span>
            <span className="panel-bar need-bar">
              <span className="panel-bar-fill" style={{ width: `${percent}%`, background: needColor(percent) }} />
            </span>
            <span className="need-percent">{percent} %</span>
          </div>
        )
      })}
      <div className="panel-line">Steuer: {formatWhole(taxOf(house))} Münzen pro Zyklus</div>
      {house.missingMaterials && <div className="panel-line invalid">Aufstieg wartet auf Baumaterial</div>}
    </>
  )
}

function refundOf(cost: BuildingCost): BuildingCost {
  const back = (value: number): number => Math.floor(value * config.refundRate)
  return { coins: back(cost.coins), tools: back(cost.tools), wood: back(cost.wood), bricks: back(cost.bricks), marble: back(cost.marble) }
}

function needColor(percent: number): string {
  if (percent >= 100) return '#4cd964'
  return percent < config.population.shortageBelow ? '#ff4d4d' : '#ffd23f'
}
