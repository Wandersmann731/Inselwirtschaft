// The symbols of the interface: the coin, the heads of the build menu, the states a workshop can be in, warnings.
import { ball, box, gloss, line, oval, poly, solid, tone, type Ctx, type Draw, type Rgb } from './kit'
import { portrait } from './people'

const GOLD: Rgb = [236, 186, 60]
const GREEN: Rgb = [92, 170, 70]
const RED: Rgb = [206, 56, 50]

/** An anchor around (x, y), `s` high. */
export function anchor(g: Ctx, x: number, y: number, s: number, colour: string, width = s * 0.1): void {
  g.strokeStyle = colour
  g.lineWidth = width
  g.lineCap = 'round'
  g.beginPath()
  g.arc(x, y - s * 0.4, s * 0.09, 0, Math.PI * 2)
  g.moveTo(x, y - s * 0.31)
  g.lineTo(x, y + s * 0.42)
  g.moveTo(x - s * 0.2, y - s * 0.14)
  g.lineTo(x + s * 0.2, y - s * 0.14)
  g.moveTo(x - s * 0.34, y + s * 0.12)
  g.quadraticCurveTo(x - s * 0.3, y + s * 0.44, x, y + s * 0.42)
  g.quadraticCurveTo(x + s * 0.3, y + s * 0.44, x + s * 0.34, y + s * 0.12)
  g.stroke()
  for (const dir of [-1, 1]) poly(g, [x + dir * s * 0.34, y + s * 0.02, x + dir * s * 0.44, y + s * 0.2, x + dir * s * 0.26, y + s * 0.18], colour)
}

/** A coin with an anchor struck on it. */
function coin(g: Ctx, x: number, y: number, r: number): void {
  ball(g, x, y, r, GOLD)
  oval(g, x, y, r * 0.8, r * 0.8, tone(GOLD, 0.92))
  oval(g, x - r * 0.08, y - r * 0.08, r * 0.74, r * 0.74, tone(GOLD, 1.16))
  anchor(g, x, y, r * 1.1, tone(GOLD, 0.62))
  gloss(g, x - r * 0.4, y - r * 0.5, r * 0.3, r * 0.1, 0.6)
}

/** A wheel with teeth around (x, y). */
function gear(g: Ctx, x: number, y: number, r: number, c: Rgb): void {
  for (let k = 0; k < 8; k++) {
    g.save()
    g.translate(x, y)
    g.rotate((k / 8) * Math.PI * 2)
    box(g, -r * 0.2, -r * 1.02, r * 0.4, r * 0.44, r * 0.08, tone(c, k < 2 || k > 6 ? 1.16 : 0.84))
    g.restore()
  }
  ball(g, x, y, r * 0.8, c)
  oval(g, x, y, r * 0.34, r * 0.34, 'rgba(30, 30, 36, 0.55)')
}

/** A thick arrow from the lower left up to the right (or mirrored, down). */
function arrow(g: Ctx, c: Rgb, up: boolean): void {
  g.save()
  if (!up) {
    g.translate(0, 64)
    g.scale(1, -1)
  }
  solid(g, [8, 50, 28, 26, 22, 20, 52, 8, 46, 38, 39, 31, 20, 56], c)
  g.restore()
}

/** A small house around (x, base). */
function house(g: Ctx, x: number, base: number, w: number, wall: Rgb, roof: Rgb): void {
  box(g, x - w * 0.36, base - w * 0.5, w * 0.72, w * 0.5, 2, wall)
  solid(g, [x - w * 0.5, base - w * 0.46, x, base - w * 0.96, x + w * 0.5, base - w * 0.46], roof)
}

export const UI: Record<string, Draw> = {
  coin: (g) => coin(g, 32, 32, 25),
  population: (g) => {
    // two townspeople, drawn like the portraits of the tiers: a woman in a kerchief, and a man in a cap before her
    g.save()
    g.translate(21, 13)
    g.scale(0.68, 0.68)
    portrait(g, {
      skin: [232, 190, 156], hair: [120, 80, 48], coat: [150, 70, 62], shirt: [242, 236, 222], long: true,
      hat: (h) => {
        oval(h, 32, 13.4, 12.6, 8.4, [232, 224, 204])
        oval(h, 27, 11, 5, 2.4, 'rgba(255, 255, 255, 0.4)', -0.3)
      },
    })
    g.restore()
    g.save()
    g.translate(-2, 11)
    g.scale(0.82, 0.82)
    portrait(g, {
      skin: [226, 180, 140], hair: [84, 58, 40], coat: [62, 96, 132], shirt: [238, 230, 212], beard: 'moustache',
      hat: (h) => {
        oval(h, 30.6, 11.8, 12.6, 6.2, [98, 76, 56])
        oval(h, 25, 15.4, 7, 2.1, [74, 56, 42])
        gloss(h, 27, 9.2, 4, 1.3, 0.2)
      },
    })
    g.restore()
  },
  warning: (g) => {
    solid(g, [32, 6, 60, 54, 4, 54], [246, 196, 44], 0.24)
    box(g, 29.4, 22, 5.2, 18, 2.6, 'rgb(60, 44, 30)')
    oval(g, 32, 46.4, 3, 3, 'rgb(60, 44, 30)')
  },
  balance_up: (g) => {
    arrow(g, GREEN, true)
    coin(g, 46, 46, 13)
  },
  balance_down: (g) => {
    coin(g, 20, 22, 13)
    arrow(g, RED, false)
  },
  cat_housing: (g) => {
    house(g, 32, 56, 52, [232, 212, 176], [176, 78, 60])
    box(g, 27, 40, 10, 16, 5, [128, 90, 58])
    for (const dx of [-3, 3]) ball(g, 32 + dx, 29, 4.4, [214, 70, 96])
    poly(g, [24.8, 30.4, 39.2, 30.4, 32, 38], 'rgb(196, 56, 84)')
  },
  cat_production: (g) => {
    gear(g, 30, 34, 24, [226, 150, 50])
    line(g, [20, 54, 42, 24], 5, 'rgb(128, 94, 62)')
    solid(g, [34, 12, 52, 16, 54, 28, 46, 30, 38, 24], [142, 146, 156])
  },
  cat_public: (g) => {
    box(g, 12, 32, 30, 24, 2, [236, 226, 204])
    solid(g, [8, 34, 27, 16, 46, 34], [176, 78, 60])
    box(g, 42, 16, 12, 40, 2, [226, 214, 190])
    solid(g, [40, 18, 48, 6, 56, 18], [176, 78, 60])
    box(g, 22, 42, 9, 14, 4.5, [112, 78, 52])
    box(g, 45.6, 22, 4.8, 8, 2.4, 'rgb(84, 66, 52)')
    line(g, [48, 0, 48, 7], 1.4, 'rgb(96, 72, 50)')
    line(g, [45.4, 2.6, 50.6, 2.6], 1.4, 'rgb(96, 72, 50)')
  },
  cat_infrastructure: (g) => {
    solid(g, [8, 58, 24, 30, 40, 30, 56, 58], [120, 122, 130])
    for (const y of [34, 42, 51]) box(g, 30.6, y, 2.8, 5, 1, 'rgb(236, 206, 90)')
    anchor(g, 32, 17, 26, tone(GOLD, 0.94), 3)
  },
  cat_trade: (g) => {
    coin(g, 32, 52, 11)
    solid(g, [8, 34, 56, 34, 50, 46, 14, 46], [128, 88, 56])
    line(g, [32, 34, 32, 6], 2, 'rgb(104, 78, 54)')
    solid(g, [34, 8, 52, 14, 50, 28, 34, 30], [244, 238, 222], 0.16)
    solid(g, [30, 12, 14, 18, 16, 30, 30, 30], [232, 224, 206], 0.16)
    poly(g, [32, 2, 40, 4, 32, 7], 'rgb(196, 60, 52)')
  },
  cat_statistics: (g) => {
    box(g, 8, 12, 48, 40, 4, [240, 226, 188], 0.16)
    box(g, 6, 9, 52, 7, 3.5, [214, 190, 140])
    box(g, 6, 48, 52, 7, 3.5, [214, 190, 140])
    for (const [x, h, c] of [[16, 10, [78, 132, 196]], [26, 16, [92, 170, 70]], [36, 22, [236, 186, 60]], [46, 28, [206, 96, 56]]] as [number, number, Rgb][]) box(g, x - 3.6, 46 - h, 7.2, h, 1.4, c)
  },
  cat_worldmap: (g) => {
    solid(g, [6, 16, 22, 10, 42, 16, 58, 10, 58, 48, 42, 54, 22, 48, 6, 54], [232, 214, 170], 0.18)
    for (const [x, y, rx, ry] of [[18, 26, 7, 5], [44, 24, 8, 5], [40, 40, 6, 4], [20, 40, 4, 3]]) oval(g, x, y, rx, ry, [140, 160, 96])
    // the rose of the winds
    poly(g, [32, 14, 36, 28, 32, 32, 28, 28], 'rgb(196, 60, 52)')
    poly(g, [32, 50, 36, 36, 32, 32, 28, 36], 'rgb(84, 70, 60)')
    poly(g, [14, 32, 28, 28, 32, 32, 28, 36], 'rgb(120, 100, 84)')
    poly(g, [50, 32, 36, 28, 32, 32, 36, 36], 'rgb(120, 100, 84)')
    oval(g, 32, 32, 2.4, 2.4, GOLD)
  },
  cat_demolish: (g) => {
    for (const [x, y, r] of [[40, 48, 9], [52, 40, 6], [28, 52, 6], [46, 30, 5]]) solid(g, [x - r, y + r * 0.4, x - r * 0.4, y - r * 0.8, x + r * 0.7, y - r * 0.6, x + r, y + r * 0.6, x, y + r], [130, 128, 124])
    line(g, [10, 54, 36, 20], 4.6, 'rgb(128, 94, 62)')
    g.fillStyle = tone([110, 114, 124])
    g.beginPath()
    g.moveTo(18, 14)
    g.quadraticCurveTo(38, 8, 52, 26)
    g.quadraticCurveTo(38, 18, 22, 22)
    g.closePath()
    g.fill()
  },
  status_producing: (g) => gear(g, 32, 32, 27, GREEN),
  status_waiting: (g) => {
    box(g, 14, 6, 36, 6, 2, GOLD)
    box(g, 14, 52, 36, 6, 2, GOLD)
    solid(g, [18, 12, 46, 12, 34, 32, 46, 52, 18, 52, 30, 32], [226, 236, 240], 0.14)
    poly(g, [24, 18, 40, 18, 33, 28, 31, 28], 'rgb(236, 186, 60)')
    poly(g, [22, 52, 42, 52, 32, 40], 'rgb(236, 186, 60)')
    line(g, [32, 30, 32, 42], 1.2, 'rgb(236, 186, 60)')
  },
  status_full: (g) => {
    for (const [x, y] of [[20, 24], [32, 20], [44, 24], [26, 30], [38, 30]]) ball(g, x, y, 7.4, [236, 138, 44])
    solid(g, [8, 32, 56, 32, 52, 58, 12, 58], [176, 120, 64])
    for (const x of [22, 32, 42]) line(g, [x, 34, x, 56], 1, 'rgba(100, 62, 30, 0.6)')
    box(g, 7, 30, 50, 5, 2, [206, 150, 86])
  },
  status_inactive: (g) => {
    for (const x of [14, 36]) box(g, x, 10, 14, 44, 4, [150, 154, 160])
  },
  status_nohub: (g) => {
    house(g, 32, 58, 56, RED, [160, 36, 36])
    box(g, 28.4, 30, 7.2, 24, 2, 'rgb(250, 246, 240)')
    box(g, 20, 38.4, 24, 7.2, 2, 'rgb(250, 246, 240)')
  },
  status_noroad: (g) => {
    solid(g, [6, 58, 22, 8, 30, 8, 34, 22, 28, 30, 33, 42, 27, 58], RED)
    solid(g, [36, 58, 42, 44, 37, 32, 43, 22, 34, 8, 42, 8, 58, 58], RED)
    for (const y of [14, 28, 44]) box(g, 30.6, y, 2.8, 6, 1, 'rgba(255, 236, 200, 0.8)')
  },
}
