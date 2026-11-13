import { gameTitle } from '../i18n/language'

/**
 * The title of the game as letters of gold with an anchor under them. It is text and a drawn shape, no picture;
 * its look is set in index.html (.wordmark), because the loading screen shows it before any stylesheet has arrived.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <h1 className={`wordmark ${className ?? ''}`}>
      <span>{gameTitle()}</span>
      <svg viewBox="0 0 48 40" aria-hidden="true">
        <defs>
          <linearGradient id="wm-gold-menu" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fbe7ae" />
            <stop offset="0.5" stopColor="#e2b24f" />
            <stop offset="1" stopColor="#8e5c18" />
          </linearGradient>
        </defs>
        <g fill="none" stroke="url(#wm-gold-menu)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="24" cy="6" r="3.4" />
          <path d="M24 9.6V35M15 15h18M7 22c1 9 8 13 17 13s16-4 17-13" />
          <path d="M3 24l4-6 5 5M45 24l-4-6-5 5" />
        </g>
      </svg>
    </h1>
  )
}
