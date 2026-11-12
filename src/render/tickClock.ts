/**
 * Game time with a fraction between two ticks, so that things on the map move smoothly instead of jumping once per
 * tick. It follows the speed of the game: at 4x it runs four times as fast, in a pause it stands still.
 */
export class TickClock {
  private tick = -1
  private tickAt = 0
  private tickLength = 1000

  /** `tick` is the tick of the state on screen, `now` the time of the frame in milliseconds. */
  ticks(tick: number, now: number): number {
    if (tick !== this.tick) {
      // how long the last tick took tells how fast the game runs
      if (this.tick >= 0 && tick > this.tick) this.tickLength = Math.max(40, Math.min(1500, (now - this.tickAt) / (tick - this.tick)))
      this.tick = tick
      this.tickAt = now
    }
    return tick + Math.min(1, (now - this.tickAt) / this.tickLength)
  }
}
