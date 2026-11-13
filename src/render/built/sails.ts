// The sails of a windmill. They are no part of the mill's picture: they turn, so they are drawn anew over it.
type Ctx = CanvasRenderingContext2D

/** How fast the sails turn while the mill grinds, in turns per second. */
export const SAIL_TURNS = 0.11

/** The angle of the sails at a time (milliseconds): they turn while the mill works and stand still when it does not. Pure. */
export function sailAngle(now: number, working: boolean): number {
  return 0.5 + (working ? (now / 1000) * SAIL_TURNS * Math.PI * 2 : 0)
}

/** A cross of four lattice blades with cloth around the hub at (x, y), each `long` world pixels, turned by `angle`. */
export function drawSails(g: Ctx, x: number, y: number, long: number, angle: number): void {
  g.save()
  g.translate(x, y)
  g.rotate(angle)
  for (let k = 0; k < 4; k++) {
    g.rotate(Math.PI / 2)
    g.fillStyle = 'rgb(232, 224, 204)'
    g.fillRect(1.2, -long, 4.6, long - 4)
    g.fillStyle = 'rgba(16, 20, 44, 0.16)'
    for (let step = 5; step < long - 1; step += 3.4) g.fillRect(1.2, -step - 0.25, 4.6, 0.5)
    g.fillStyle = 'rgb(104, 80, 56)'
    g.fillRect(-0.55, -long, 1.1, long)
    g.fillRect(5.6, -long, 0.5, long - 4)
  }
  g.fillStyle = 'rgb(70, 54, 40)'
  g.beginPath()
  g.arc(0, 0, 1.7, 0, Math.PI * 2)
  g.fill()
  g.restore()
}
