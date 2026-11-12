import { useEffect, useRef, useState } from 'react'
import { audio } from '../audio/engine'
import { config } from '../data'
import type { GameLoop } from '../game/gameLoop'
import { t } from '../i18n/language'
import { declineQuest, deliverQuest, questSource } from '../sim/quests'
import type { GameState } from '../sim/state'
import { Icon } from './Icon'
import { formatWhole, resourceName } from './messages'

const PAID_MS = 5000

/**
 * The open order of the trader town: what it asks for, what it pays and how long it waits. "Liefern" hands over
 * the goods from the store; it is only active once enough of them lie there.
 */
export function QuestNotice({ loop, state }: { loop: GameLoop; state: GameState }) {
  const [paid, setPaid] = useState<number | null>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const quest = state.quest
  if (!quest) {
    return paid === null ? null : (
      <div className="toast good">
        <span aria-hidden="true">✓</span> {t(`Auftrag erfüllt: +${formatWhole(paid)} Münzen`, `Order filled: +${formatWhole(paid)} coins`)}
      </div>
    )
  }

  const stock = Math.max(0, ...state.islands.filter((island) => island.owned).map((island) => island.stock[quest.good] ?? 0))
  const ready = questSource(state) !== null
  const cycles = Math.max(1, Math.ceil((quest.expires - state.tick) / config.economyCycleTicks))
  const deliver = (): void => {
    loop.dispatch(deliverQuest)
    audio.play('ui_coin')
    setPaid(quest.reward)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setPaid(null), PAID_MS)
  }
  return (
    <div className="quest" role="group" aria-label={t('Auftrag der Händlerstadt', 'Order of the trader town')}>
      <Icon name={`goods/${quest.good}`} size={34} />
      <div className="quest-text">
        <span className="quest-title">{t('Auftrag der Händlerstadt', 'Order of the trader town')}</span>
        <strong>
          {quest.amount} t {resourceName(quest.good)} → +{formatWhole(quest.reward)} <Icon name="ui/coin" size={18} title={resourceName('coins')} />
        </strong>
        <span className="quest-state">
          {t(`im Lager ${formatWhole(Math.min(stock, quest.amount))}/${quest.amount} t`, `in store ${formatWhole(Math.min(stock, quest.amount))}/${quest.amount} t`)} ·{' '}
          {cycles === 1 ? t('noch 1 Zyklus', '1 cycle left') : t(`noch ${cycles} Zyklen`, `${cycles} cycles left`)}
        </span>
      </div>
      <button type="button" className="action-button confirm" disabled={!ready} onClick={deliver}>
        {t('Liefern', 'Deliver')}
      </button>
      <button type="button" className="panel-close" onClick={() => loop.dispatch(declineQuest)} aria-label={t('Auftrag ablehnen', 'Turn the order down')}>
        ×
      </button>
    </div>
  )
}
