import { useState } from 'react'
import { buildings, chains, getBuilding, tiers } from '../data'
import type { BuildingCategory, BuildingDef } from '../data'
import type { BuildController } from '../game/buildController'
import { buildingFlow, chainUsers } from '../game/chains'
import { spriteUrl } from '../render/sprites'
import { ghostKey } from '../render/spriteKeys'
import type { IslandState } from '../sim/state'
import { buildingBlocker } from '../sim/build'
import { blockerLabel, resourceName } from './messages'
import { Cost, Icon } from './Icon'

const CATEGORIES: { id: BuildingCategory; label: string; icon: string }[] = [
  { id: 'housing', label: 'Wohnen', icon: 'ui/cat_housing' },
  { id: 'public', label: 'Öffentlich', icon: 'ui/cat_public' },
  { id: 'production', label: 'Produktion', icon: 'ui/cat_production' },
  { id: 'infrastructure', label: 'Infrastruktur', icon: 'ui/cat_infrastructure' },
]

const tierName = (id: string): string => tiers.find((tier) => tier.id === id)?.name ?? id

interface BuildMenuProps {
  tool: BuildController
  state: IslandState
  onOpenStats: () => void
  onOpenWorld: () => void
  onOpenTrade: () => void
}

interface Group {
  id: string
  title?: string
  users?: string
  defs: BuildingDef[]
}

/** Production buildings are grouped by chain, everything else is one plain list. */
function groupsFor(category: BuildingCategory): Group[] {
  if (category !== 'production') return [{ id: category, defs: buildings.filter((def) => def.category === category) }]
  return chains.map((chain) => ({
    id: chain.id,
    title: chain.name,
    users: chainUsers(chain).join(', '),
    defs: chain.buildings.map(getBuilding),
  }))
}

function Thumb({ def }: { def: BuildingDef }) {
  if (def.kind === 'road') return <Icon name="ui/cat_infrastructure" size={40} />
  return <img className="build-thumb" src={spriteUrl(ghostKey(def.id))} alt="" draggable={false} onError={(event) => (event.currentTarget.style.visibility = 'hidden')} />
}

/** "Holz + Erz → Eisen" as little pictures, so the chain can be read without words. */
function Flow({ id }: { id: string }) {
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

export function BuildMenu({ tool, state, onOpenStats, onOpenWorld, onOpenTrade }: BuildMenuProps) {
  const [open, setOpen] = useState<BuildingCategory | null>(null)
  const groups = open ? groupsFor(open) : []

  return (
    <div className="build-menu">
      {open && (
        <div className="build-items">
          {groups.map((group) => (
            <section key={group.id} className="build-group">
              {group.title && (
                <h3 className="build-group-title">
                  {group.title}
                  {group.users && <span className="build-group-users"> · für {group.users}</span>}
                </h3>
              )}
              <div className="build-group-row">
                {group.defs.map((def, index) => {
                  const blocker = buildingBlocker(state, def)
                  const unavailable = blocker !== null && blocker.code !== 'debt'
                  return (
                    <div key={def.id} className="build-step">
                      {index > 0 && group.title && <span className="chain-arrow">›</span>}
                      <button
                        type="button"
                        className="build-item"
                        disabled={unavailable}
                        onClick={() => (def.kind === 'road' ? tool.startRoads() : tool.startPlacing(def.id))}
                      >
                        <Thumb def={def} />
                        <span className="build-item-text">
                          <span className="build-item-name">{def.name}</span>
                          <span className="build-item-size">
                            <Flow id={def.id} />
                            {def.kind === 'road' ? 'planen' : `${def.size[0]}×${def.size[1]}`}
                            {unavailable && blocker
                              ? ` · ${blockerLabel(blocker, tierName(def.unlockTier))}`
                              : def.unlockTier !== 'pioneers'
                                ? ` · ab ${tierName(def.unlockTier)}`
                                : ''}
                          </span>
                          <span className="build-item-cost">
                            <Cost cost={def.cost} size={16} />
                          </span>
                        </span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
      <div className="build-categories">
        {CATEGORIES.map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            className={id === open ? 'category-button active' : 'category-button'}
            onClick={() => setOpen(id === open ? null : id)}
          >
            <Icon name={icon} size={26} />
            <span>{label}</span>
          </button>
        ))}
        <button type="button" className="category-button demolish" onClick={() => tool.startDemolish()}>
          <Icon name="ui/cat_demolish" size={26} />
          <span>Abriss</span>
        </button>
        <button type="button" className="category-button" onClick={onOpenStats}>
          <Icon name="ui/cat_statistics" size={26} />
          <span>Statistik</span>
        </button>
        <button type="button" className="category-button" onClick={onOpenWorld}>
          <Icon name="ui/cat_worldmap" size={26} />
          <span>Weltkarte</span>
        </button>
        <button type="button" className="category-button" onClick={onOpenTrade}>
          <Icon name="ui/cat_trade" size={26} />
          <span>Handel</span>
        </button>
      </div>
    </div>
  )
}
