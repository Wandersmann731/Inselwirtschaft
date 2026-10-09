import { config, getBuilding } from '../data'
import type { BuildController } from '../game/buildController'
import { STATUS_COLORS } from '../render/buildingRenderer'
import { upkeepOf } from '../sim/production'
import type { GameState } from '../sim/state'
import { resourceName, statusText } from './messages'

/** Info panel of the selected building: state of a producer, buffers, upkeep and the off switch. */
export function BuildingPanel({ tool, state, buildingId }: { tool: BuildController; state: GameState; buildingId: number }) {
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
            <span className="status-dot" style={{ background: STATUS_COLORS[production.status.kind] }} />
            {statusText(production.status)}
          </div>
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
          {production.shipments.length > 0 && (
            <div className="panel-line">Unterwegs: {production.shipments.length} Lieferung(en)</div>
          )}
        </>
      )}

      <div className="panel-line">
        Unterhalt: {upkeepOf(building)} Münzen pro Zyklus{building.active ? '' : ' (stillgelegt)'}
      </div>
      <button
        type="button"
        className="action-button panel-toggle"
        onClick={() => tool.setActive(building.id, !building.active)}
      >
        {building.active ? 'Stilllegen' : 'Wieder starten'}
      </button>
    </div>
  )
}
