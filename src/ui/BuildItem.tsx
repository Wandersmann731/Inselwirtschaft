import { tiers } from '../data'
import type { BuildingDef } from '../data'
import type { BuildController } from '../game/buildController'
import { buildingFlow } from '../game/chains'
import { spriteUrl } from '../render/sprites'
import { ghostKey } from '../render/spriteKeys'
import { buildingBlocker } from '../sim/build'
import type { IslandState } from '../sim/state'
import { Cost, Icon } from './Icon'
import { blockerLabel, resourceName } from './messages'

const tierName = (id: string): string => tiers.find((tier) => tier.id === id)?.name ?? id

function Thumb({ def }: { def: BuildingDef }) {
  if (def.kind === 'road') return <Icon name="ui/cat_infrastructure" size={40} />
  return <img className="build-thumb" src={spriteUrl(ghostKey(def.id))} alt="" draggable={false} onError={(event) => (event.currentTarget.style.visibility = 'hidden')} />
}

/** "Holz + Erz → Eisen" as little pictures, so the chain can be read without words. */
export function Flow({ id }: { id: string }) {
  const { inputs, outputs } = buildingFlow(id)
  if (outputs.length === 0) return null
  return (
    <span className="build-flow">
      {inputs.map((good) => (
        <Icon key={good} name={`goods/${good}`} size={18} title={resourceName(good)} />
      ))}
      {inputs.length > 0 && <span className="flow-arrow">→</span>}
      {outputs.map((good) => (
        <Icon key={good} name={`goods/${good}`} size={18} title={resourceName(good)} />
      ))}
    </span>
  )
}

/** One building in the build menu: picture, name, what it makes, cost. Tapping it starts placing. */
export function BuildItem({ def, state, tool, count }: { def: BuildingDef; state: IslandState; tool: BuildController; count?: number }) {
  const blocker = buildingBlocker(state, def)
  const unavailable = blocker !== null && blocker.code !== 'debt'
  return (
    <button
      type="button"
      className="build-item"
      disabled={unavailable}
      onClick={() => (def.kind === 'road' ? tool.startRoads() : tool.startPlacing(def.id))}
    >
      <Thumb def={def} />
      {count !== undefined && count > 0 && <span className="build-count">{count}×</span>}
      <span className="build-item-text">
        <span className="build-item-name">{def.name}</span>
        <span className="build-item-size">
          <Flow id={def.id} />
          {unavailable && blocker
            ? blockerLabel(blocker, tierName(def.unlockTier))
            : def.kind === 'road'
              ? 'planen'
              : def.unlockTier !== 'pioneers'
                ? `ab ${tierName(def.unlockTier)}`
                : ''}
        </span>
        <span className="build-item-cost">
          <Cost cost={def.cost} size={16} />
        </span>
      </span>
    </button>
  )
}
