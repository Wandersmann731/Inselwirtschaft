import { getSettings } from '../save/settings'
import type { Levels } from './mix'

const BASE = `${import.meta.env.BASE_URL}audio/`
const FADE_SECONDS = 1.2
const MUSIC_FADE_MS = 2500

interface Loop {
  source: AudioBufferSourceNode
  gain: GainNode
}

/**
 * The sound system: sound effects, looping ambience that follows the camera, and background music.
 * Browsers only allow sound after a tap, so nothing starts before unlock() was called from a user gesture.
 * Missing files are skipped, so sounds can be added one by one.
 */
class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private effects: GainNode | null = null
  private ambience: GainNode | null = null
  private index: Record<string, string> | null = null
  private indexLoading: Promise<void> | null = null
  private buffers = new Map<string, AudioBuffer | null>()
  private loading = new Map<string, Promise<AudioBuffer | null>>()
  private loops = new Map<string, Loop>()
  private wantedLoops: Levels = {}
  private lastPlayed = new Map<string, number>()

  private music: HTMLAudioElement | null = null
  private musicTracks: string[] = []
  private musicSignature = ''
  private musicIndex = 0
  private musicVolume = 0

  /** Must be called from a tap or click. Creates the audio context the first time. */
  unlock(): void {
    if (!this.ctx) {
      const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Context) return
      this.ctx = new Context()
      this.master = this.ctx.createGain()
      this.effects = this.ctx.createGain()
      this.ambience = this.ctx.createGain()
      this.effects.connect(this.master)
      this.ambience.connect(this.master)
      this.master.connect(this.ctx.destination)
      this.applySettings()
      void this.loadIndex().then(() => {
        this.syncLoops()
        this.syncMusic()
      })
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  get unlocked(): boolean {
    return this.ctx !== null
  }

  /** Applies volume and mute settings. Call after the settings changed. */
  applySettings(): void {
    const settings = getSettings()
    if (!this.ctx || !this.master || !this.effects || !this.ambience) return
    const now = this.ctx.currentTime
    this.master.gain.setTargetAtTime(settings.muted ? 0 : 1, now, 0.05)
    this.effects.gain.setTargetAtTime(settings.volumeEffects, now, 0.05)
    this.ambience.gain.setTargetAtTime(settings.volumeAmbience * 0.6, now, 0.05)
    if (this.music) this.music.volume = settings.muted ? 0 : Math.min(1, settings.volumeMusic * this.musicVolume)
  }

  private loadIndex(): Promise<void> {
    this.indexLoading ??= fetch(`${BASE}index.json`)
      .then((response) => (response.ok ? response.json() : {}))
      .then((json: Record<string, string>) => {
        this.index = json
      })
      .catch(() => {
        this.index = {}
      })
    return this.indexLoading
  }

  private buffer(id: string): Promise<AudioBuffer | null> {
    const ready = this.buffers.get(id)
    if (ready !== undefined) return Promise.resolve(ready)
    let pending = this.loading.get(id)
    if (!pending) {
      pending = this.loadIndex()
        .then(async () => {
          const folder = this.index?.[id]
          if (!folder || !this.ctx) return null
          const response = await fetch(`${BASE}${folder}/${id}.mp3`)
          if (!response.ok) return null
          return await this.ctx.decodeAudioData(await response.arrayBuffer())
        })
        .catch(() => null)
        .then((buffer) => {
          this.buffers.set(id, buffer)
          return buffer
        })
      this.loading.set(id, pending)
    }
    return pending
  }

  /** Plays a sound effect once. The same sound is not repeated within `minGapMs`. */
  play(id: string, volume = 1, minGapMs = 80): void {
    if (!this.ctx || !this.effects) return
    const now = performance.now()
    if (now - (this.lastPlayed.get(id) ?? -1e9) < minGapMs) return
    this.lastPlayed.set(id, now)
    void this.buffer(id).then((buffer) => {
      if (!buffer || !this.ctx || !this.effects) return
      const source = this.ctx.createBufferSource()
      const gain = this.ctx.createGain()
      gain.gain.value = volume
      source.buffer = buffer
      source.connect(gain).connect(this.effects)
      source.start()
    })
  }

  /** Sets which looping sounds should be heard, with levels from 0 to 1. Others fade out. */
  setLoops(levels: Levels): void {
    this.wantedLoops = levels
    this.syncLoops()
  }

  private syncLoops(): void {
    const ctx = this.ctx
    if (!ctx || !this.ambience) return
    const ambience = this.ambience
    for (const [id, level] of Object.entries(this.wantedLoops)) {
      if (level <= 0.02) continue
      const running = this.loops.get(id)
      if (running) {
        running.gain.gain.setTargetAtTime(level, ctx.currentTime, FADE_SECONDS / 3)
        continue
      }
      void this.buffer(id).then((buffer) => {
        if (!buffer || this.loops.has(id) || (this.wantedLoops[id] ?? 0) <= 0.02) return
        const source = ctx.createBufferSource()
        const gain = ctx.createGain()
        gain.gain.value = 0
        source.buffer = buffer
        source.loop = true
        source.connect(gain).connect(ambience)
        source.start(0, Math.random() * buffer.duration)
        gain.gain.setTargetAtTime(this.wantedLoops[id] ?? 0, ctx.currentTime, FADE_SECONDS / 3)
        this.loops.set(id, { source, gain })
      })
    }
    for (const [id, loop] of this.loops) {
      if ((this.wantedLoops[id] ?? 0) > 0.02) continue
      loop.gain.gain.setTargetAtTime(0, ctx.currentTime, FADE_SECONDS / 3)
      this.loops.delete(id)
      window.setTimeout(() => {
        loop.source.stop()
        loop.source.disconnect()
        loop.gain.disconnect()
      }, FADE_SECONDS * 1500)
    }
  }

  /** Plays these tracks one after another, repeating. An empty list stops the music. Changing the list fades over. */
  setMusic(tracks: string[]): void {
    const signature = tracks.join(',')
    if (signature === this.musicSignature) return
    this.musicSignature = signature
    this.musicTracks = tracks
    this.musicIndex = Math.floor(Math.random() * Math.max(1, tracks.length))
    this.syncMusic()
  }

  private fadeMusic(element: HTMLAudioElement, to: number, done?: () => void): void {
    const from = this.musicVolume
    const started = performance.now()
    const step = (): void => {
      const t = Math.min(1, (performance.now() - started) / MUSIC_FADE_MS)
      this.musicVolume = from + (to - from) * t
      const settings = getSettings()
      element.volume = settings.muted ? 0 : Math.min(1, settings.volumeMusic * this.musicVolume)
      if (t < 1 && this.music === element) requestAnimationFrame(step)
      else done?.()
    }
    step()
  }

  private syncMusic(): void {
    if (!this.ctx || !this.index) return
    const available = this.musicTracks.filter((id) => this.index?.[id] === 'music')
    const old = this.music
    if (old) {
      this.music = null
      const settings = getSettings()
      const from = this.musicVolume
      const started = performance.now()
      const fade = (): void => {
        const t = Math.min(1, (performance.now() - started) / MUSIC_FADE_MS)
        old.volume = settings.muted ? 0 : Math.min(1, settings.volumeMusic * from * (1 - t))
        if (t < 1) requestAnimationFrame(fade)
        else {
          old.pause()
          old.src = ''
        }
      }
      fade()
    }
    if (available.length === 0) return
    const id = available[this.musicIndex % available.length]
    const element = new Audio(`${BASE}music/${id}.mp3`)
    element.volume = 0
    this.music = element
    this.musicVolume = 0
    element.addEventListener('ended', () => {
      if (this.music !== element) return
      this.musicIndex++
      this.syncMusic()
    })
    element.play().then(() => this.fadeMusic(element, 1)).catch(() => {
      /* blocked until the next tap */
    })
  }
}

export const audio = new AudioEngine()
