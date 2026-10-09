import { useEffect } from 'react'
import { config } from '../data'
import type { GameLoop } from '../game/gameLoop'
import type { MapRenderer } from '../render/mapRenderer'
import { audio } from './engine'
import { ambienceLevels, chapelNear, eventsBetween, workLevels } from './mix'

const BUILD_TRACKS = ['music_build_1', 'music_build_2', 'music_build_3']

interface Options {
  loop: GameLoop
  getRenderer: () => MapRenderer | null
  /** The world map is open: play sea music. */
  worldOpen: boolean
}

/** Starts the sound system with the first tap and keeps sound effects, ambience and music in step with the game. */
export function useGameAudio({ loop, getRenderer, worldOpen }: Options): void {
  // Sound is only allowed after a tap. Every button press also gets a soft click.
  useEffect(() => {
    const onDown = (event: PointerEvent): void => {
      audio.unlock()
      if (event.target instanceof Element && event.target.closest('button')) audio.play('ui_tap')
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [])

  // Sound effects for what happens in the game.
  useEffect(() => {
    let previous = loop.getState()
    return loop.subscribe(() => {
      const next = loop.getState()
      for (const id of eventsBetween(previous, next)) audio.play(id, 1, 150)
      if (Math.floor(next.tick / config.economyCycleTicks) !== Math.floor(previous.tick / config.economyCycleTicks)) {
        const renderer = getRenderer()
        if (renderer) {
          const centre = renderer.cameraTile()
          if (chapelNear(loop.getIslandState(), centre.x, centre.y)) audio.play('work_chapel_bell', 0.7, 5000)
        }
      }
      previous = next
    })
  }, [loop, getRenderer])

  // Ambience and work noise follow the camera.
  useEffect(() => {
    const timer = window.setInterval(() => {
      const renderer = getRenderer()
      if (!renderer || !audio.unlocked) return
      const island = loop.getIslandState()
      const centre = renderer.cameraTile()
      const levels = { ...ambienceLevels(island, centre.x, centre.y) }
      for (const [id, level] of Object.entries(workLevels(island, centre.x, centre.y))) levels[id] = Math.max(levels[id] ?? 0, level)
      if (loop.getState().ships.some((ship) => ship.island === null) && worldOpen) levels.amb_ship_sail = 0.8
      audio.setLoops(levels)
    }, 500)
    return () => window.clearInterval(timer)
  }, [loop, getRenderer, worldOpen])

  // Music: sea music on the world map, tense music in debt, otherwise the building tracks.
  useEffect(() => {
    const update = (): void => {
      const debt = loop.getState().coins < 0
      audio.setMusic(worldOpen ? ['music_sea'] : debt ? ['music_trouble'] : BUILD_TRACKS)
    }
    update()
    return loop.subscribe(update)
  }, [loop, worldOpen])

  // Stop the sounds of this game when it is left.
  useEffect(
    () => () => {
      audio.setLoops({})
      audio.setMusic([])
    },
    [],
  )
}
