import { useMemo, useSyncExternalStore } from 'react'
import { BuildController } from './game/buildController'
import type { GameLoop } from './game/gameLoop'
import { BuildBar } from './ui/BuildBar'
import { MapCanvas } from './ui/MapCanvas'
import { RotateHint } from './ui/RotateHint'
import { TopHud } from './ui/TopHud'

export function App({ loop }: { loop: GameLoop }) {
  const state = useSyncExternalStore(loop.subscribe, loop.getState)
  const tool = useMemo(() => new BuildController(loop), [loop])

  return (
    <>
      <MapCanvas getState={loop.getState} tool={tool} />
      <TopHud
        tick={state.tick}
        coins={state.coins}
        stock={state.stock}
        speed={state.speed}
        onSpeedChange={(speed) => loop.setSpeed(speed)}
      />
      <BuildBar tool={tool} loop={loop} />
      <RotateHint />
    </>
  )
}
