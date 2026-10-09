import { migrateState } from '../sim/migrations'
import type { GameState } from '../sim/state'

const DB_NAME = 'inselwirtschaft'
const STORE_NAME = 'saves'
const DEFAULT_SLOT = 'autosave'
const LOCAL_STORAGE_PREFIX = 'inselwirtschaft:'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'))
      return
    }
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function idbWrite(slot: string, json: string): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(json, slot)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

async function idbRead(slot: string): Promise<string | null> {
  const db = await openDb()
  try {
    return await new Promise<string | null>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(slot)
      request.onsuccess = () => resolve(typeof request.result === 'string' ? request.result : null)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

/** Short description of a save, shown in the load menu. */
export interface SaveInfo {
  tick: number
  coins: number
  residents: number
  seed: number
  /** Milliseconds since 1970. */
  savedAt: number
}

export function describeSave(state: GameState): SaveInfo {
  const residents = state.islands.reduce(
    (sum, island) => sum + island.buildings.reduce((inner, building) => inner + (building.house?.residents ?? 0), 0),
    0,
  )
  return { tick: state.tick, coins: Math.floor(state.coins), residents: Math.floor(residents), seed: state.seed, savedAt: Date.now() }
}

const infoSlot = (slot: string): string => `${slot}:info`

/** Saves to IndexedDB, falls back to localStorage if IndexedDB fails. */
export async function saveState(state: GameState, slot: string = DEFAULT_SLOT): Promise<void> {
  const json = JSON.stringify(state)
  const info = JSON.stringify(describeSave(state))
  try {
    await idbWrite(slot, json)
    await idbWrite(infoSlot(slot), info)
  } catch (error) {
    console.warn('IndexedDB save failed, using localStorage', error)
    localStorage.setItem(LOCAL_STORAGE_PREFIX + slot, json)
    localStorage.setItem(LOCAL_STORAGE_PREFIX + infoSlot(slot), info)
  }
}

/** The short description of a slot, or null if the slot is empty. */
export async function loadSaveInfo(slot: string = DEFAULT_SLOT): Promise<SaveInfo | null> {
  let json: string | null = null
  try {
    json = await idbRead(infoSlot(slot))
  } catch {
    /* fall through to localStorage */
  }
  json ??= localStorage.getItem(LOCAL_STORAGE_PREFIX + infoSlot(slot))
  if (json === null) return null
  try {
    return JSON.parse(json) as SaveInfo
  } catch {
    return null
  }
}

/** Names of the slots: the autosave and the manual slots. */
export function manualSlots(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `slot${i + 1}`)
}

export const AUTOSAVE_SLOT = DEFAULT_SLOT

/** Deletes every save of this game. */
export async function deleteAllSaves(count: number): Promise<void> {
  for (const slot of [DEFAULT_SLOT, ...manualSlots(count)]) {
    for (const name of [slot, infoSlot(slot)]) {
      localStorage.removeItem(LOCAL_STORAGE_PREFIX + name)
      try {
        const db = await openDb()
        await new Promise<void>((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readwrite')
          tx.objectStore(STORE_NAME).delete(name)
          tx.oncomplete = () => resolve()
          tx.onerror = () => resolve()
        })
        db.close()
      } catch {
        /* no IndexedDB: nothing to delete there */
      }
    }
  }
}

/** Loads and migrates a save. Returns null if there is none. Throws if it is unreadable. */
export async function loadState(slot: string = DEFAULT_SLOT): Promise<GameState | null> {
  let json: string | null = null
  try {
    json = await idbRead(slot)
  } catch (error) {
    console.warn('IndexedDB load failed, trying localStorage', error)
  }
  json ??= localStorage.getItem(LOCAL_STORAGE_PREFIX + slot)
  if (json === null) return null
  return migrateState(JSON.parse(json))
}
