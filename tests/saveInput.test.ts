import { afterEach, describe, expect, it, vi } from 'vitest'
import { config } from '../src/data'
import { GameLoop } from '../src/game/gameLoop'
import { MapInput, type MapInputHandlers } from '../src/input/touch'
import { liftIsland } from '../src/sim/islands'
import { testIsland } from './helpers'

/** A localStorage stand-in for the node test environment. */
function fakeStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial))
  return {
    get length() {
      return data.size
    },
    key: (i: number) => [...data.keys()][i] ?? null,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
    clear: () => data.clear(),
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.resetModules()
})

describe('save slots', () => {
  it('loads the newer of the IndexedDB and the localStorage copy', async () => {
    const { newerSource } = await import('../src/save/saveGame')
    const info = (savedAt: number) => JSON.stringify({ tick: 1, coins: 1, residents: 0, seed: 1, savedAt })
    expect(newerSource(info(100), info(200))).toBe('local')
    expect(newerSource(info(300), info(200))).toBe('idb')
    expect(newerSource(info(300), null)).toBe('idb')
    expect(newerSource(null, info(200))).toBe('local')
    expect(newerSource(null, null)).toBeNull()
  })

  it('falls back to localStorage without IndexedDB and reads the save back from there', async () => {
    vi.stubGlobal('localStorage', fakeStorage())
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { loadSaveInfo, loadState, saveState } = await import('../src/save/saveGame')
    const state = liftIsland(testIsland({ coins: 1234 }))
    await saveState(state, 'slot1')
    expect((await loadSaveInfo('slot1'))?.coins).toBe(1234)
    expect((await loadState('slot1'))?.coins).toBe(1234)
  })
})

describe('settings', () => {
  it('saves only what the player changed, not the ?debug switch or the browser language', async () => {
    const storage = fakeStorage()
    vi.stubGlobal('localStorage', storage)
    vi.stubGlobal('window', { location: { search: '?debug' } })
    const { getSettings, updateSettings } = await import('../src/save/settings')
    expect(getSettings().debug).toBe(true)
    updateSettings({ muted: true })
    expect(getSettings().muted).toBe(true)
    expect(JSON.parse(storage.getItem('inselwirtschaft:settings')!)).toEqual({ muted: true })
  })

  it('keeps earlier choices when another setting changes', async () => {
    const storage = fakeStorage({ 'inselwirtschaft:settings': JSON.stringify({ language: 'en' }) })
    vi.stubGlobal('localStorage', storage)
    const { getSettings, updateSettings } = await import('../src/save/settings')
    updateSettings({ vibration: false })
    expect(getSettings().language).toBe('en')
    expect(JSON.parse(storage.getItem('inselwirtschaft:settings')!)).toEqual({ language: 'en', vibration: false })
  })
})

describe('game loop in the background', () => {
  it('does not catch up on the time the page was hidden', () => {
    let update: () => void = () => {}
    vi.stubGlobal('window', { setInterval: (fn: () => void) => ((update = fn), 1), clearInterval: () => {} })
    const doc = Object.assign(new EventTarget(), { hidden: false })
    vi.stubGlobal('document', doc)
    let now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    const loop = new GameLoop(liftIsland(testIsland()))
    loop.start()
    const start = loop.getState().tick
    now = config.tickMillis
    update()
    expect(loop.getState().tick).toBe(start + 1)
    // hidden: the phone stops the timer at once, no update runs until the page comes back minutes later
    doc.hidden = true
    doc.dispatchEvent(new Event('visibilitychange'))
    now += 300_000
    doc.hidden = false
    doc.dispatchEvent(new Event('visibilitychange'))
    now += config.loopIntervalMs
    update()
    expect(loop.getState().tick).toBe(start + 1)
    loop.stop()
  })
})

describe('pinch with a third finger', () => {
  function setup() {
    const listeners = new Map<string, (event: unknown) => void>()
    const canvas = {
      addEventListener: (type: string, fn: (event: unknown) => void) => listeners.set(type, fn),
      removeEventListener: () => {},
      getBoundingClientRect: () => ({ left: 0, top: 0 }),
      setPointerCapture: () => {},
      hasPointerCapture: () => false,
      releasePointerCapture: () => {},
    }
    const zooms: number[] = []
    const pans: [number, number][] = []
    const handlers: MapInputHandlers = { onPan: (dx, dy) => pans.push([dx, dy]), onZoom: (factor) => zooms.push(factor), onTap: () => {} }
    new MapInput(canvas as unknown as HTMLCanvasElement, handlers)
    const fire = (type: string, pointerId: number, x: number, y: number) =>
      listeners.get(type)!({ pointerId, clientX: x, clientY: y, timeStamp: 0 })
    return { fire, zooms, pans }
  }

  it('goes on with the two fingers left, without a jump', () => {
    const { fire, zooms, pans } = setup()
    fire('pointerdown', 1, 0, 0)
    fire('pointerdown', 2, 100, 0)
    fire('pointerdown', 3, 400, 0)
    fire('pointerup', 1, 0, 0)
    zooms.length = 0
    pans.length = 0
    // fingers 2 and 3 (300 px apart) move together by 5 px
    fire('pointermove', 2, 105, 0)
    expect(zooms[0]).toBeCloseTo(295 / 300)
    expect(pans[0][0]).toBeCloseTo(2.5)
  })
})

describe('screen wake lock', () => {
  it('is held only while a game is on screen, also when a request was still pending on leaving', async () => {
    const locks: { released: boolean; release(): Promise<void> }[] = []
    const request = () => {
      const lock = { released: false, release: async () => void (lock.released = true) }
      locks.push(lock)
      return Promise.resolve(lock)
    }
    vi.stubGlobal('navigator', { wakeLock: { request } })
    vi.stubGlobal('document', Object.assign(new EventTarget(), { visibilityState: 'visible' }))
    vi.stubGlobal('localStorage', fakeStorage())
    const { applyWakeLock, setWakeLockActive } = await import('../src/ui/wakeLock')
    applyWakeLock() // the start screen's settings: no lock
    await Promise.resolve()
    expect(locks).toHaveLength(0)
    setWakeLockActive(true)
    setWakeLockActive(false) // left before the request came back
    await Promise.resolve()
    expect(locks.map((lock) => lock.released)).toEqual([true])
    setWakeLockActive(true)
    await Promise.resolve()
    expect(locks[1].released).toBe(false)
    setWakeLockActive(false)
    expect(locks[1].released).toBe(true)
  })
})
