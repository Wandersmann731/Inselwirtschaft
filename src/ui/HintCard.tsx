import { useState, useSyncExternalStore } from 'react'
import { getBuilding } from '../data'
import type { TutorialStep } from '../data'
import type { BuildController } from '../game/buildController'
import type { GameLoop } from '../game/gameLoop'
import { t } from '../i18n/language'
import { getSettings } from '../save/settings'
import type { GameState, IslandState } from '../sim/state'
import { getTier } from '../sim/tiers'
import { chapterOf, currentHint, isConnected, offeredBuilding, skipHint } from '../sim/tutorial'
import { hintText, inText } from './hintTexts'

interface Props {
  loop: GameLoop
  state: GameState
  island: IslandState
  tool: BuildController
}

/** A building of the tip that stands but delivers nothing yet: no road, or no trading post or market house in reach. */
function waitingBuilding(step: TutorialStep, island: IslandState): IslandState['buildings'][number] | null {
  return island.buildings.find((building) => (step.build ?? []).includes(building.type) && !isConnected(building)) ?? null
}

/** The line under the tip that says why the built producer does not count yet. */
function waitingNote(name: string, noRoad: boolean): string {
  return noRoad
    ? t(`${name}: noch keine Straße zum Kontor, darum kommt nichts im Lager an.`, `Not connected yet: the ${inText(name)} needs a road to the trading post.`)
    : t(`${name}: außerhalb von Kontor und Markthaus, darum kommt nichts im Lager an.`, `The ${inText(name)} is out of reach of the trading post and market house, so it delivers nothing.`)
}

/**
 * The goals of the beginner: what to build next and why, with the list of goals of the current tier. A new goal
 * shows by itself; "–" folds the card into a small button. On a phone the text and the list stay folded until
 * "▾" is tapped, so the card does not hide the map. Out of the way while a build tool, an info panel or a build
 * menu category is open (the last one in CSS).
 */
export function HintCard({ loop, state, island, tool }: Props) {
  const snapshot = useSyncExternalStore(tool.subscribe, tool.getSnapshot)
  const [foldedId, setFoldedId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const step = currentHint(state)
  if (!getSettings().hints || !step || !island.owned) return null
  if (snapshot.mode !== 'none' || snapshot.selectedBuildingId !== null) return null

  const chapter = chapterOf(state, step.id)
  const reached = chapter.filter((entry) => entry.done).length
  const count = chapter.length > 0 ? `${reached}/${chapter.length}` : ''
  if (foldedId === step.id) {
    return (
      <button type="button" className="hint-chip" onClick={() => setFoldedId(null)}>
        💡 {t('Ziele', 'Goals')} {count}
      </button>
    )
  }

  const text = hintText(step.id)
  const tierName = getTier(step.tier).name
  const build = offeredBuilding(step, island)
  const waiting = waitingBuilding(step, island)
  const noRoad = waiting?.production?.status.kind === 'noRoad'
  const last = step.done.length === 0
  return (
    <div className={open ? 'hint-card open' : 'hint-card'} role="dialog" aria-live="polite" aria-label={text.title}>
      <div className="panel-title">
        <strong className="hint-title">
          <span className="hint-bulb">💡 </span>
          {text.title}
        </strong>
        {count && (
          <span className="hint-count" title={t(`${reached} von ${chapter.length} Zielen der ${tierName} erreicht`, `${reached} of ${chapter.length} goals of the ${inText(tierName)} reached`)}>
            {count}
          </span>
        )}
        <button
          type="button"
          className="panel-close hint-more"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={open ? t('Weniger anzeigen', 'Show less') : t('Mehr anzeigen', 'Show more')}
        >
          {open ? '▴' : '▾'}
        </button>
        <button type="button" className="panel-close hint-fold" onClick={() => setFoldedId(step.id)} aria-label={t('Ziele einklappen', 'Collapse goals')}>
          –
        </button>
      </div>
      {chapter.length > 0 && (
        <div className="hint-progress" aria-hidden="true">
          <span style={{ width: `${(reached / chapter.length) * 100}%` }} />
        </div>
      )}
      <div className="hint-details">
        <p className="hint-body">{text.body}</p>
      </div>
      {waiting && <p className="hint-note">{waitingNote(getBuilding(waiting.type).name, noRoad)}</p>}
      <div className="hint-actions">
        {waiting && noRoad ? (
          <button type="button" className="action-button confirm" onClick={() => tool.startRoadFrom(waiting.id)}>
            {t('Straße bauen', 'Build road')}
          </button>
        ) : build && (
          <button type="button" className="action-button confirm" onClick={() => tool.startPlacing(build)}>
            {t('Bauen', 'Build')}: {getBuilding(build).name}
          </button>
        )}
        <button type="button" className={last ? 'action-button' : 'action-button hint-skip'} onClick={() => loop.dispatch((current) => skipHint(current, step.id))}>
          {last ? t('Fertig', 'Done') : t('Überspringen', 'Skip')}
        </button>
      </div>
      {chapter.length > 0 && (
        <details className="hint-details hint-goals">
          <summary>
            {t(`Ziele der ${tierName}`, `Goals of the ${inText(tierName)}`)} · {count}
          </summary>
          <ol>
            {chapter.map((entry) => (
              <li key={entry.step.id} className={entry.done ? 'done' : entry.step.id === step.id ? 'current' : undefined}>
                <span className="goal-mark">{entry.done ? '✓' : entry.step.id === step.id ? '▸' : '○'}</span>
                {hintText(entry.step.id).title}
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  )
}
