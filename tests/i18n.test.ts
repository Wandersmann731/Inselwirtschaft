import { afterEach, describe, expect, it } from 'vitest'
import { buildings, chains, climates, goods, landNames, tiers } from '../src/data'
import { applyDataLanguage } from '../src/i18n/dataNames'
import { t } from '../src/i18n/language'
import { updateSettings } from '../src/save/settings'

afterEach(() => {
  applyDataLanguage('de')
  updateSettings({ language: 'de' })
})

describe('language', () => {
  it('picks the German or the English text', () => {
    expect(t('Bauen', 'Build')).toBe('Bauen')
    updateSettings({ language: 'en' })
    expect(t('Bauen', 'Build')).toBe('Build')
  })

  it('gives every good, building, tier, climate, chain, fertility and deposit an English name and can switch back', () => {
    const german = [...goods, ...buildings, ...tiers, ...climates, ...chains, ...landNames.fertilities, ...landNames.deposits].map((entry) => [entry, entry.name] as const)
    applyDataLanguage('en')
    for (const [entry] of german) expect(entry.name, `${entry.id} is not translated`).not.toMatch(/[äöüß]/)
    expect(goods.find((g) => g.id === 'food')!.name).toBe('Food')
    applyDataLanguage('de')
    for (const [entry, de] of german) expect(entry.name).toBe(de)
  })
})
