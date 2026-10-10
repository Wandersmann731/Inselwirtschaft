// The buildings the player built last, kept in localStorage for the "Zuletzt" entry of the build menu.

const KEY = 'inselwirtschaft:recent'
export const RECENT_LENGTH = 6

export function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    const list = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(list) ? list.filter((id): id is string => typeof id === 'string').slice(0, RECENT_LENGTH) : []
  } catch {
    return []
  }
}

/** Puts the building type in front and drops the oldest entry. */
export function pushRecent(list: string[], typeId: string): string[] {
  const next = [typeId, ...list.filter((id) => id !== typeId)].slice(0, RECENT_LENGTH)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* private mode: the list still holds until the page is closed */
  }
  return next
}
