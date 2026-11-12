import { useEffect } from 'react'
import { audio } from '../audio/engine'
import type { GameLoop } from '../game/gameLoop'
import { t } from '../i18n/language'
import { closeGoal } from '../sim/scenario'
import type { GameState } from '../sim/state'
import { totalResidents } from '../sim/tiers'
import { formatWhole, goalText } from './messages'

/** Game time as "1 h 12 min" (1 tick is a second at normal speed). */
function playTime(ticks: number): string {
  const minutes = Math.max(1, Math.round(ticks / 60))
  const hours = Math.floor(minutes / 60)
  return hours > 0 ? `${hours} h ${minutes % 60} min` : `${minutes} min`
}

/**
 * The end screen of the scenario: shown once when the goal is reached, with what the player built up. The game
 * stands still behind it; "Weiterspielen" goes on without a goal, "Zum Hauptmenü" leaves (the game is saved).
 */
export function GoalScreen({ loop, state, onQuit }: { loop: GameLoop; state: GameState; onQuit: () => void }) {
  useEffect(() => {
    const speed = loop.getState().speed
    loop.setSpeed(0)
    audio.play('music_stinger_win')
    return () => loop.setSpeed(speed === 0 ? 1 : speed)
  }, [loop])

  const owned = state.islands.filter((island) => island.owned)
  const buildings = owned.reduce((sum, island) => sum + island.buildings.length, 0)
  const facts: [string, string][] = [
    [t('Spielzeit', 'Time played'), playTime(state.goalReachedTick ?? state.tick)],
    [t('Einwohner', 'Residents'), formatWhole(totalResidents(state))],
    [t('Gebäude', 'Buildings'), formatWhole(buildings)],
    [t('Inseln', 'Islands'), formatWhole(owned.length)],
    [t('Münzen', 'Coins'), formatWhole(state.coins)],
    [t('Erfüllte Aufträge', 'Orders filled'), formatWhole(state.questsDone)],
  ]
  return (
    <div className="stats-backdrop goal-backdrop">
      <div className="stats-panel goal-screen" role="dialog" aria-label={t('Ziel erreicht', 'Goal reached')}>
        <div className="goal-stars" aria-hidden="true">
          <span>★</span>
          <span>★</span>
          <span>★</span>
        </div>
        <h2>{t('Ziel erreicht!', 'Goal reached!')}</h2>
        <p className="goal-line">{goalText()}</p>
        <dl className="goal-facts">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <p className="stats-note">
          {t(
            'Deine Inselwirtschaft läuft. Du kannst frei weiterbauen: Kaufleute, Aristokraten und weitere Inseln warten.',
            'Your island economy is up and running. You can keep building freely: merchants, aristocrats and more islands are waiting.',
          )}
        </p>
        <div className="goal-actions">
          <button type="button" className="action-button confirm" onClick={() => loop.dispatch(closeGoal)}>
            {t('Weiterspielen', 'Keep playing')}
          </button>
          <button
            type="button"
            className="action-button"
            onClick={() => {
              // seen is seen: the screen does not come back when the game is opened again
              loop.dispatch(closeGoal)
              onQuit()
            }}
          >
            {t('Zum Hauptmenü', 'To the main menu')}
          </button>
        </div>
      </div>
    </div>
  )
}
