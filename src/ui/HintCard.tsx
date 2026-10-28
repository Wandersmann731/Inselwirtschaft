import { useState, useSyncExternalStore } from 'react'
import { getBuilding } from '../data'
import type { TutorialStep } from '../data'
import type { BuildController } from '../game/buildController'
import type { GameLoop } from '../game/gameLoop'
import { t } from '../i18n/language'
import { getSettings } from '../save/settings'
import { buildingBlocker } from '../sim/build'
import type { GameState, IslandState } from '../sim/state'
import { currentHint, hintProgress, isConnected, skipHint } from '../sim/tutorial'
import { hintText, inText } from './hintTexts'

interface Props {
  loop: GameLoop
  state: GameState
  island: IslandState
  tool: BuildController
}

/** The building the tip offers: the first of its list the island lacks and can build, else the first it can build at all. */
function offeredBuilding(step: TutorialStep, island: IslandState): string | null {
  const buildable = (step.build ?? []).filter((id) => {
    const blocker = buildingBlocker(island, getBuilding(id))
    return blocker === null || blocker.code === 'debt'
  })
  return buildable.find((id) => !island.buildings.some((building) => building.type === id)) ?? buildable[0] ?? null
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
 * Beginner tip: what to build next and why. A new tip opens by itself; "–" folds it into a small button.
 * Out of the way while a build tool, an info panel or a build menu category is open (the last one in CSS).
 */
export function HintCard({ loop, state, island, tool }: Props) {
  const snapshot = useSyncExternalStore(tool.subscribe, tool.getSnapshot)
  const [foldedId, setFoldedId] = useState<string | null>(null)
  const step = currentHint(state)
  if (!getSettings().hints || !step || !island.owned) return null
  if (snapshot.mode !== 'none' || snapshot.selectedBuildingId !== null) return null

  if (foldedId === step.id) {
    return (
      <button type="button" className="hint-chip" onClick={() => setFoldedId(null)}>
        💡 {t('Tipp', 'Tip')}
      </button>
    )
  }

  const text = hintText(step.id)
  const { index, total } = hintProgress(step.id)
  const build = offeredBuilding(step, island)
  const waiting = waitingBuilding(step, island)
  const noRoad = waiting?.production?.status.kind === 'noRoad'
  const last = step.done.length === 0
  return (
    <div className="hint-card" role="dialog" aria-live="polite" aria-label={text.title}>
      <div className="panel-title">
        <strong className="hint-title">💡 {text.title}</strong>
        <span className="hint-count" title={t(`Tipp ${index} von ${total}`, `Tip ${index} of ${total}`)}>
          {index}/{total}
        </span>
        <button type="button" className="panel-close" onClick={() => setFoldedId(step.id)} aria-label={t('Tipp einklappen', 'Collapse tip')}>
          –
        </button>
      </div>
      <p className="hint-body">{text.body}</p>
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
        <button type="button" className="action-button" onClick={() => loop.dispatch((current) => skipHint(current, step.id))}>
          {last ? t('Fertig', 'Done') : t('Überspringen', 'Skip')}
        </button>
      </div>
    </div>
  )
}
