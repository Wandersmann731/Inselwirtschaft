import { useCallback, useEffect, useRef, useState } from 'react'
import { App } from './App'
import { GameLoop } from './game/gameLoop'
import { startAutosave, saveNow } from './save/autosave'
import type { GameState } from './sim/state'
import { MainMenu } from './ui/MainMenu'

interface Running {
  loop: GameLoop
  stopAutosave: () => void
}

/** Switches between the start screen and a running game. */
export function Root() {
  const [running, setRunning] = useState<Running | null>(null)
  const current = useRef<Running | null>(null)

  const start = useCallback((state: GameState) => {
    const loop = new GameLoop(state)
    const next = { loop, stopAutosave: startAutosave(loop) }
    loop.start()
    current.current = next
    setRunning(next)
  }, [])

  const quit = useCallback(() => {
    const game = current.current
    if (!game) return
    game.loop.stop()
    game.stopAutosave()
    current.current = null
    void saveNow(game.loop).finally(() => setRunning(null))
  }, [])

  useEffect(
    () => () => {
      current.current?.loop.stop()
      current.current?.stopAutosave()
    },
    [],
  )

  return running ? <App loop={running.loop} onQuit={quit} /> : <MainMenu onStart={start} />
}
