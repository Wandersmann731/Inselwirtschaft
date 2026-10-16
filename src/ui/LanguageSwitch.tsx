import { getLanguage, setLanguage, type Language } from '../i18n/language'

const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'de', label: 'Deutsch' },
  { id: 'en', label: 'English' },
]

/** Two buttons to switch between German and English; the screens render again when the language changes. */
export function LanguageSwitch() {
  return (
    <span className="coin-options">
      {LANGUAGES.map((entry) => (
        <button
          key={entry.id}
          type="button"
          className={entry.id === getLanguage() ? 'category-button active' : 'category-button'}
          onClick={() => setLanguage(entry.id)}
        >
          <span>{entry.label}</span>
        </button>
      ))}
    </span>
  )
}
