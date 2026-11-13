// The five tiers of residents, each as a portrait down to the chest: a face with its light and shade, hair, and the
// clothes that tell who they are, from the straw hat and pack of the pioneer to the plumed hat and lace of the
// aristocrat.
import { bend, box, gloss, line, oval, poly, solid, tone, type Ctx, type Draw, type Rgb } from './kit'

export interface Person {
  skin: Rgb
  hair: Rgb
  coat: Rgb
  /** What shows at the neck: a shirt, a collar. */
  shirt: Rgb
  /** A full beard, a moustache, or a shaven face. */
  beard?: 'full' | 'moustache'
  /** Hair that falls to the collar (worn under a hat by the better sort). */
  long?: boolean
  hat: (g: Ctx) => void
  /** What is worn over the coat, painted before the head. */
  dress?: (g: Ctx) => void
  /** What is carried, painted last. */
  carry?: (g: Ctx) => void
}

/** A coat over the shoulders: broad at the bottom of the picture, with lapels that open on the shirt. */
function coat(g: Ctx, p: Person): void {
  const run = g.createLinearGradient(8, 38, 56, 64)
  run.addColorStop(0, tone(p.coat, 1.34))
  run.addColorStop(0.5, tone(p.coat))
  run.addColorStop(1, tone(p.coat, 0.6))
  g.fillStyle = run
  g.beginPath()
  g.moveTo(3, 64)
  g.bezierCurveTo(4, 46, 12, 41, 25, 38.6)
  g.lineTo(39, 38.6)
  g.bezierCurveTo(52, 41, 60, 46, 61, 64)
  g.closePath()
  g.fill()
  // the shirt in the opening, the shade of the chin on it
  poly(g, [25.4, 38.6, 32, 57, 38.6, 38.6], tone(p.shirt))
  poly(g, [25.4, 38.6, 32, 46, 38.6, 38.6], 'rgba(40, 34, 50, 0.22)')
  // lapels, and folds from the shoulders
  solid(g, [25.4, 38.6, 19, 41, 26, 54, 32, 57], p.coat.map((v) => v * 1.12) as Rgb, 0.2)
  solid(g, [38.6, 38.6, 45, 41, 38, 54, 32, 57], p.coat.map((v) => v * 0.8) as Rgb, 0.2)
  bend(g, 12, 47, 14, 56, 12, 64, 0.9, tone(p.coat, 0.62, 0.7))
  bend(g, 52, 47, 50, 56, 52, 64, 0.9, tone(p.coat, 0.5, 0.7))
}

function head(g: Ctx, p: Person): void {
  // the neck, in the shade of the chin
  box(g, 27, 31, 10, 10.4, 3.4, p.skin.map((v) => v * 0.78) as Rgb, 0.16)
  if (p.long) {
    oval(g, 21.4, 28, 4.4, 10, p.hair, 0.12)
    oval(g, 42.6, 28, 4.4, 10, p.hair.map((v) => v * 0.78) as Rgb, -0.12)
  }
  // ears
  oval(g, 21.2, 25.4, 2, 3.2, p.skin)
  oval(g, 42.8, 25.4, 2, 3.2, p.skin.map((v) => v * 0.82) as Rgb)
  // the face: broad at the cheekbones, narrower at the chin, lit from the upper left
  const face = g.createRadialGradient(27.6, 20, 2, 32, 25, 15)
  face.addColorStop(0, tone(p.skin, 1.16))
  face.addColorStop(0.62, tone(p.skin))
  face.addColorStop(1, tone(p.skin, 0.76))
  g.fillStyle = face
  g.beginPath()
  g.moveTo(21.6, 20)
  g.bezierCurveTo(21.4, 9, 42.6, 9, 42.4, 20)
  g.bezierCurveTo(42.6, 29, 39, 36.6, 32, 37.4)
  g.bezierCurveTo(25, 36.6, 21.4, 29, 21.6, 20)
  g.fill()
  // a little red in the cheeks, the shade of the far side
  oval(g, 25.6, 28, 3, 2.2, 'rgba(214, 110, 96, 0.26)')
  oval(g, 38.6, 28, 3, 2.2, 'rgba(196, 96, 86, 0.3)')
  poly(g, [39, 16, 42.4, 20, 41.6, 30, 37, 36, 39.4, 28], 'rgba(60, 36, 40, 0.16)')
  // hair at the temples
  poly(g, [21.4, 23, 21.8, 14, 26.4, 12.6, 24.4, 21], tone(p.hair))
  poly(g, [42.6, 23, 42.2, 14, 37.6, 12.6, 39.6, 21], tone(p.hair, 0.78))
  // eyes: the white, the iris, a spark of light; brows over them
  for (const x of [27.4, 36.6]) {
    oval(g, x, 24, 2.3, 1.5, 'rgb(246, 240, 230)')
    oval(g, x + 0.2, 24.1, 1.2, 1.3, 'rgb(72, 52, 40)')
    oval(g, x - 0.2, 23.6, 0.4, 0.4, 'rgb(255, 255, 255)')
    bend(g, x - 2.6, 22.6, x, 21.6, x + 2.6, 22.6, 0.6, 'rgba(60, 40, 36, 0.7)')
  }
  bend(g, 24.6, 20.6, 27.6, 19.2, 30.2, 20.4, 1.2, tone(p.hair, 0.82))
  bend(g, 33.8, 20.4, 36.4, 19.2, 39.4, 20.6, 1.2, tone(p.hair, 0.7))
  // the nose: its shade on the far side, light on its ridge and tip
  line(g, [33, 24.4, 33.8, 29.4, 31.4, 30], 0.9, tone(p.skin, 0.68, 0.9))
  line(g, [31.6, 24.6, 31.6, 28.6], 0.9, tone(p.skin, 1.2, 0.7))
  // the mouth
  bend(g, 28.6, 32.8, 32, 34.2, 35.4, 32.8, 1, 'rgba(150, 72, 64, 0.9)')
  bend(g, 30, 34.6, 32, 35.2, 34, 34.6, 0.6, tone(p.skin, 0.74, 0.6))
  if (p.beard === 'full') {
    g.fillStyle = tone(p.hair)
    g.beginPath()
    g.moveTo(21.8, 26)
    g.bezierCurveTo(22, 38, 27, 42.4, 32, 42.6)
    g.bezierCurveTo(37, 42.4, 42, 38, 42.2, 26)
    g.bezierCurveTo(39, 32, 35.6, 31.4, 32, 30.8)
    g.bezierCurveTo(28.4, 31.4, 25, 32, 21.8, 26)
    g.fill()
    for (const dx of [-5, -2, 1.5, 5]) bend(g, 32 + dx, 34, 32 + dx * 1.1, 38, 32 + dx * 0.9, 41, 0.5, tone(p.hair, 0.7, 0.7))
    bend(g, 28.8, 33.4, 32, 34.6, 35.2, 33.4, 1, 'rgba(110, 56, 50, 0.9)')
  } else if (p.beard === 'moustache') {
    bend(g, 32, 31.6, 27, 30, 23.6, 32.6, 1.7, tone(p.hair))
    bend(g, 32, 31.6, 37, 30, 40.4, 32.6, 1.7, tone(p.hair, 0.8))
    oval(g, 32, 36.6, 1.6, 2.2, tone(p.hair))
  }
}

/** A hat with a crown and a brim: the brim `wide`, the crown `rise` high, a band around it, its shade on the brow. */
function brimmed(g: Ctx, c: Rgb, wide: number, rise: number, band?: Rgb, tilt = 0): void {
  g.save()
  g.translate(32, 15)
  g.rotate(tilt)
  // the shade the brim throws on the forehead
  oval(g, 0, 2.6, 10.4, 3, 'rgba(50, 30, 34, 0.3)')
  oval(g, 0, 0, wide, 4.2, c.map((v) => v * 0.74) as Rgb, 0, 0.2)
  oval(g, -0.6, -0.9, wide * 0.96, 3.4, c, 0, 0.26)
  const crown = g.createLinearGradient(-10, 0, 10, 0)
  crown.addColorStop(0, tone(c, 1.26))
  crown.addColorStop(1, tone(c, 0.7))
  g.fillStyle = crown
  g.beginPath()
  g.moveTo(-10.2, -0.6)
  g.bezierCurveTo(-10, -rise * 1.3, 10, -rise * 1.3, 10.2, -0.6)
  g.quadraticCurveTo(0, 2.4, -10.2, -0.6)
  g.fill()
  if (band) {
    g.fillStyle = tone(band)
    g.beginPath()
    g.moveTo(-10.2, -0.8)
    g.quadraticCurveTo(0, 2.2, 10.2, -0.8)
    g.lineTo(10, -3.6)
    g.quadraticCurveTo(0, -0.6, -10, -3.6)
    g.closePath()
    g.fill()
  }
  gloss(g, -5, -rise * 0.7, 3, 1.2, 0.22)
  g.restore()
}

/** Straw: fine light and dark strokes over a hat, so it is woven and not felt. */
function straw(g: Ctx, wide: number): void {
  for (let k = -5; k <= 5; k++) bend(g, 32 + k * (wide / 6), 16.4, 32 + k * (wide / 7), 13, 32 + k * 1.6, 7.6, 0.4, k % 2 ? 'rgba(255, 244, 200, 0.5)' : 'rgba(140, 104, 50, 0.5)')
}

export function portrait(g: Ctx, p: Person): void {
  coat(g, p)
  p.dress?.(g)
  head(g, p)
  p.hat(g)
  p.carry?.(g)
}

export const PEOPLE: Record<string, Draw> = {
  pioneers: (g) =>
    portrait(g, {
      skin: [224, 176, 136], hair: [112, 78, 50], coat: [150, 112, 72], shirt: [226, 212, 186], beard: 'moustache',
      hat: (h) => {
        brimmed(h, [216, 184, 112], 18, 6.4, undefined, -0.06)
        straw(h, 18)
      },
      // a patched jerkin laced at the chest, and his bundle on a stick over the shoulder
      dress: (d) => {
        for (const y of [44, 49, 54]) line(d, [29.4, y, 34.6, y + 1.6], 0.7, 'rgb(96, 70, 46)')
        box(d, 43, 50, 8, 7, 1, [128, 96, 62])
      },
      carry: (c) => {
        line(c, [3, 62, 21, 40], 2.6, 'rgb(112, 84, 56)')
        oval(c, 7, 50, 7.4, 8.4, [186, 158, 112])
        bend(c, 4, 47, 8, 51, 11, 46, 0.7, 'rgba(120, 96, 62, 0.8)')
      },
    }),
  settlers: (g) =>
    portrait(g, {
      skin: [218, 168, 128], hair: [156, 108, 60], coat: [84, 116, 158], shirt: [234, 224, 200], beard: 'full',
      hat: (h) => {
        brimmed(h, [226, 196, 122], 17, 7.4, [150, 104, 60])
        straw(h, 17)
      },
      // working clothes with straps, a hoe over the shoulder
      dress: (d) => {
        for (const x of [19.4, 40.6]) box(d, x, 41, 4, 23, 1, [58, 86, 126])
        for (const x of [21.4, 42.6]) oval(d, x, 46, 1.2, 1.2, 'rgb(214, 180, 96)')
      },
      carry: (c) => {
        line(c, [55, 64, 49, 30], 2.4, 'rgb(128, 98, 66)')
        solid(c, [44, 28, 55, 25, 56.4, 31, 46, 33], [140, 144, 154])
      },
    }),
  citizens: (g) =>
    portrait(g, {
      skin: [228, 186, 150], hair: [96, 66, 44], coat: [66, 108, 70], shirt: [242, 238, 226],
      // a soft cap of cloth, pulled to one side
      hat: (h) => {
        oval(h, 32, 16.6, 10.6, 2.6, 'rgba(50, 30, 34, 0.3)')
        oval(h, 30.6, 11.6, 13, 6.6, [104, 86, 68])
        oval(h, 24.6, 15.4, 7, 2.2, [82, 66, 52])
        gloss(h, 27, 9, 4, 1.4, 0.2)
      },
      // a doublet with a row of buttons, a white collar turned out over it
      dress: (d) => {
        poly(d, [25.4, 38.6, 18, 40.6, 24, 46, 30, 42], 'rgb(246, 242, 232)')
        poly(d, [38.6, 38.6, 46, 40.6, 40, 46, 34, 42], 'rgb(226, 222, 214)')
        for (const y of [48, 53, 58]) {
          oval(d, 32, y, 1.4, 1.4, [222, 186, 96])
          oval(d, 31.6, y - 0.4, 0.5, 0.5, 'rgba(255, 255, 255, 0.7)')
        }
      },
    }),
  merchants: (g) =>
    portrait(g, {
      skin: [222, 176, 138], hair: [70, 48, 36], coat: [44, 64, 112], shirt: [246, 242, 232], beard: 'full', long: true,
      hat: (h) => {
        brimmed(h, [50, 46, 60], 16, 9.4, [182, 146, 62], 0.05)
        // a feather stuck in the band
        bend(h, 41, 9, 52, -1, 57, 9, 3, 'rgb(196, 68, 58)')
        bend(h, 41, 9, 51, 1, 55, 9, 0.7, 'rgb(240, 150, 130)')
      },
      // a fur collar, and the chain of his guild with its medal
      dress: (d) => {
        for (let k = 0; k < 7; k++) {
          oval(d, 17 + k * 1.5, 41 + k * 2.6, 3.6, 3, [122, 92, 62])
          oval(d, 47 - k * 1.5, 41 + k * 2.6, 3.6, 3, [100, 74, 50])
        }
        d.setLineDash([1.6, 1.2])
        bend(d, 21, 46, 32, 66, 43, 46, 1.6, 'rgb(226, 186, 76)')
        d.setLineDash([])
        oval(d, 32, 57.6, 3.2, 3.2, [236, 192, 72])
        oval(d, 31.2, 56.8, 1, 1, 'rgba(255, 255, 255, 0.7)')
      },
    }),
  aristocrats: (g) =>
    portrait(g, {
      skin: [232, 194, 164], hair: [58, 42, 40], coat: [112, 50, 126], shirt: [250, 248, 244], beard: 'moustache', long: true,
      hat: (h) => {
        brimmed(h, [58, 38, 72], 20, 8, [218, 180, 72], -0.08)
        // an ostrich feather swept back over the brim, soft and white
        for (const [dy, w, c] of [[0, 5.6, 'rgb(244, 240, 232)'], [2.4, 3, 'rgb(214, 208, 204)'], [-1.6, 2, 'rgb(255, 255, 255)']] as [number, number, string][]) bend(h, 25, 8 + dy * 0.3, 8, -4 + dy, 3, 13 + dy, w, c)
        oval(h, 25, 9, 2, 2, [226, 188, 84])
      },
      // a lace collar that lies wide over the shoulders, gold braid down the front, a jewel at the throat
      dress: (d) => {
        for (let k = 0; k < 9; k++) {
          const t = k / 8
          oval(d, 16 + t * 32, 42.4 + Math.sin(t * Math.PI) * 4.4, 3.4, 4, [252, 250, 246])
          oval(d, 16 + t * 32, 44 + Math.sin(t * Math.PI) * 4.4, 1, 1, 'rgba(180, 176, 190, 0.7)')
        }
        for (const x of [12, 52]) line(d, [x, 50, x + (x < 32 ? 2 : -2), 64], 1.8, 'rgb(218, 180, 72)')
        for (const y of [54, 59]) line(d, [26, y, 38, y], 1.2, 'rgb(218, 180, 72)')
        oval(d, 32, 42, 2.2, 2.2, [196, 44, 70])
        oval(d, 31.4, 41.4, 0.7, 0.7, 'rgba(255, 255, 255, 0.8)')
      },
    }),
}
