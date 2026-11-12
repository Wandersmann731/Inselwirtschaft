import { afterEach, describe, expect, it } from 'vitest'
import { buildings, chains, climates, goods, landNames, tiers } from '../src/data'
import { applyDataLanguage, shipName } from '../src/i18n/dataNames'
import { gameTitle, logoFile, t } from '../src/i18n/language'
import { updateSettings } from '../src/save/settings'

afterEach(() => {
  applyDataLanguage('de')
  updateSettings({ language: 'de' })
})

describe('language', () => {
  it('picks the German or the English text', () => {
    updateSettings({ language: 'de' })
    expect(t('Bauen', 'Build')).toBe('Bauen')
    updateSettings({ language: 'en' })
    expect(t('Bauen', 'Build')).toBe('Build')
  })

  it('names the game and picks the title picture in the player\'s language', () => {
    updateSettings({ language: 'de' })
    expect([gameTitle(), logoFile()]).toEqual(['Inselwirtschaft', 'logo.webp'])
    updateSettings({ language: 'en' })
    expect([gameTitle(), logoFile()]).toEqual(['Island Economy', 'logo_en.webp'])
  })

  it('gives every good, building, tier, climate, chain, fertility and deposit an English name and can switch back', () => {
    const german = [...goods, ...buildings, ...tiers, ...climates, ...chains, ...landNames.fertilities, ...landNames.deposits].map((entry) => [entry, entry.name] as const)
    applyDataLanguage('en')
    for (const [entry] of german) expect(entry.name, `${entry.id} is not translated`).not.toMatch(/[äöüß]/)
    expect(goods.find((g) => g.id === 'food')!.name).toBe('Food')
    applyDataLanguage('de')
    for (const [entry, de] of german) expect(entry.name).toBe(de)
  })

  it('shows the built-in ship name in English, and leaves other names alone', () => {
    expect(shipName('Handelsschiff 3')).toBe('Handelsschiff 3')
    updateSettings({ language: 'en' })
    expect(shipName('Handelsschiff 3')).toBe('Trading ship 3')
    expect(shipName('Seeadler')).toBe('Seeadler')
  })
})
