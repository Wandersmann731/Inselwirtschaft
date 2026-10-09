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

/** Saves to IndexedDB, falls back to localStorage if IndexedDB fails. */
export async function saveState(state: GameState, slot: string = DEFAULT_SLOT): Promise<void> {
  const json = JSON.stringify(state)
  try {
    await idbWrite(slot, json)
  } catch (error) {
    console.warn('IndexedDB save failed, using localStorage', error)
    localStorage.setItem(LOCAL_STORAGE_PREFIX + slot, json)
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
