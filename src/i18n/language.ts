import { getSettings, updateSettings } from '../save/settings'
import { applyDataLanguage } from './dataNames'

export type Language = 'de' | 'en'

const listeners = new Set<() => void>()

export function getLanguage(): Language {
  return getSettings().language
}

/** Picks the text for the current language: the German original and its English version side by side. */
export function t(de: string, en: string): string {
  return getSettings().language === 'en' ? en : de
}

/** Locale for number formatting. */
export function numberLocale(): string {
  return getSettings().language === 'en' ? 'en-US' : 'de-DE'
}

/** Decimal number with one place, comma in German and point in English. */
export function oneDecimal(value: number): string {
  const text = value.toFixed(1)
  return getSettings().language === 'en' ? text : text.replace('.', ',')
}

export function setLanguage(language: Language): void {
  updateSettings({ language })
  applyDataLanguage(language)
  document.documentElement.lang = language
  listeners.forEach((listener) => listener())
}

/** For useSyncExternalStore: the root renders the screens again when the language changes. */
export function subscribeLanguage(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Applies the saved language to the game data; call once at start. */
export function initLanguage(): void {
  applyDataLanguage(getLanguage())
  document.documentElement.lang = getLanguage()
}
