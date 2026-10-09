import { useSyncExternalStore } from 'react'
import type { GameLoop } from './game/gameLoop'
import { MapCanvas } from './ui/MapCanvas'
import { RotateHint } from './ui/RotateHint'
import { TopHud } from './ui/TopHud'

export function App({ loop }: { loop: GameLoop }) {
  const state = useSyncExternalStore(loop.subscribe, loop.getState)

  return (
    <>
      <MapCanvas getState={loop.getState} />
      <TopHud
        tick={state.tick}
        coins={state.coins}
        speed={state.speed}
        onSpeedChange={(speed) => loop.setSpeed(speed)}
      />
      <RotateHint />
    </>
  )
}
