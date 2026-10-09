import { useSyncExternalStore } from 'react'
import type { BuildController } from '../game/buildController'
import type { IslandState } from '../sim/state'
import { BuildingPanel } from './BuildingPanel'
import { BuildMenu } from './BuildMenu'
import { DrawBar } from './DrawBar'
import { PlaceBar } from './PlaceBar'

interface BuildBarProps {
  tool: BuildController
  island: IslandState
  onOpenStats: () => void
  onOpenWorld: () => void
  onOpenTrade: () => void
  onOpenKontor: () => void
}

/** Bottom bar: the build menu, or the bar of the active build tool. */
export function BuildBar({ tool, island, onOpenStats, onOpenWorld, onOpenTrade, onOpenKontor }: BuildBarProps) {
  const snapshot = useSyncExternalStore(tool.subscribe, tool.getSnapshot)
  if (!island.owned) return <ForeignBar />
  if (snapshot.mode === 'place') return <PlaceBar tool={tool} snapshot={snapshot} state={island} />
  if (snapshot.mode === 'road' || snapshot.mode === 'demolish') return <DrawBar tool={tool} snapshot={snapshot} state={island} />
  return (
    <>
      {snapshot.selectedBuildingId !== null && (
        <BuildingPanel tool={tool} state={island} buildingId={snapshot.selectedBuildingId} onOpenKontor={onOpenKontor} />
      )}
      <BuildMenu tool={tool} state={island} onOpenStats={onOpenStats} onOpenWorld={onOpenWorld} onOpenTrade={onOpenTrade} />
    </>
  )

  function ForeignBar() {
    return (
      <div className="place-bar">
        <div className="place-info">
          <strong>{island.name}</strong>
          <span className="place-hint">
            {island.role === 'trader' ? 'Insel der Händler' : 'Noch nicht erschlossen'}: Hier kannst du noch nicht bauen.
          </span>
        </div>
        <div className="place-actions">
          <button type="button" className="action-button" onClick={onOpenWorld}>
            Weltkarte
          </button>
        </div>
      </div>
    )
  }
}
