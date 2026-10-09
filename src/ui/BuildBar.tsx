import { useSyncExternalStore } from 'react'
import type { BuildController } from '../game/buildController'
import type { GameLoop } from '../game/gameLoop'
import { BuildingPanel } from './BuildingPanel'
import { BuildMenu } from './BuildMenu'
import { DrawBar } from './DrawBar'
import { PlaceBar } from './PlaceBar'

/** Bottom bar: the build menu, or the bar of the active build tool. */
export function BuildBar({ tool, loop }: { tool: BuildController; loop: GameLoop }) {
  const snapshot = useSyncExternalStore(tool.subscribe, tool.getSnapshot)
  const state = useSyncExternalStore(loop.subscribe, loop.getState)
  if (snapshot.mode === 'place') return <PlaceBar tool={tool} snapshot={snapshot} state={state} />
  if (snapshot.mode === 'road' || snapshot.mode === 'demolish') return <DrawBar tool={tool} mode={snapshot.mode} />
  return (
    <>
      {snapshot.selectedBuildingId !== null && (
        <BuildingPanel tool={tool} state={state} buildingId={snapshot.selectedBuildingId} />
      )}
      <BuildMenu tool={tool} state={state} />
    </>
  )
}
