import { describe, expect, it } from 'vitest'
import { initialSettings } from '../src/save/settings'

describe('settings at start', () => {
  it('starts without music when the game is embedded in another page', () => {
    expect(initialSettings({}, '?embed').volumeMusic).toBe(0)
    expect(initialSettings({}, '').volumeMusic).toBeGreaterThan(0)
  })

  it('keeps the music volume the player chose, also when embedded', () => {
    expect(initialSettings({ volumeMusic: 0.7 }, '?embed').volumeMusic).toBe(0.7)
  })

  it('keeps sound effects and ambience when embedded', () => {
    const settings = initialSettings({}, '?embed')
    expect(settings.volumeEffects).toBeGreaterThan(0)
    expect(settings.volumeAmbience).toBeGreaterThan(0)
    expect(settings.muted).toBe(false)
  })

  it('still switches on debug from the address', () => {
    expect(initialSettings({}, '?embed&debug').debug).toBe(true)
  })
})
