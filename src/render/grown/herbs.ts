// What grows low: tufts of grass and patches of flowers. Small, but there are thousands of them on a map, and they
// are what makes a meadow of a green plane.
import { css, dab, mix, numbers, shape, type Ctx, type Rgb } from './paint'

const BLADES: Rgb[] = [[70, 104, 50], [96, 126, 58], [124, 146, 72], [150, 150, 84]]

/** Blades that fan out from a foot at (x, base). */
function blades(g: Ctx, x: number, base: number, count: number, reach: number, high: number, next: () => number): void {
  for (let i = 0; i < count; i++) {
    const lean = (next() - 0.5) * 2
    const long = high * (0.55 + 0.45 * next())
    const from = x + lean * reach * 0.3
    const tip: [number, number] = [x + lean * reach, base - long * (1 - 0.35 * Math.abs(lean))]
    const knee: [number, number] = [from + lean * reach * 0.3, base - long * 0.7]
    const tone = mix(BLADES[Math.floor(next() * BLADES.length)], [255, 240, 200], lean < 0 ? 0.12 : 0, lean > 0.3 ? 0.84 : 1)
    g.fillStyle = css(tone)
    g.beginPath()
    g.moveTo(from - 0.45, base)
    g.quadraticCurveTo(knee[0] - 0.3, knee[1], tip[0], tip[1])
    g.quadraticCurveTo(knee[0] + 0.4, knee[1], from + 0.45, base)
    g.closePath()
    g.fill()
  }
}

/** A tuft of grass in a picture `w` by `h` world pixels. Three kinds: full, sparse and dry, tall. */
export function tuft(g: Ctx, w: number, h: number, variant: number): void {
  const next = numbers(variant * 53 + 11)
  const base = h - 2
  dab(g, w / 2 + 1, base, w * 0.3, 1.6, 'rgba(24, 34, 30, 0.3)')
  blades(g, w / 2, base, variant === 2 ? 11 : 17, w * (variant === 3 ? 0.26 : 0.36), h * (variant === 3 ? 0.86 : 0.7), next)
  if (variant === 2) for (let i = 0; i < 4; i++) dab(g, w / 2 + (next() - 0.5) * w * 0.5, base - h * 0.5 * next(), 0.5, 0.9, 'rgb(176, 160, 96)')
}

const BLOOMS: Rgb[][] = [[[236, 204, 84], [244, 240, 228]], [[188, 70, 66], [150, 110, 170]]]

/** A patch of flowers: low leaves and blossoms over them. Two kinds: yellow and white, red and violet. */
export function flowers(g: Ctx, w: number, h: number, variant: number): void {
  const next = numbers(variant * 59 + 13)
  const base = h - 3
  dab(g, w / 2 + 1, base + 0.5, w * 0.36, 2.2, 'rgba(24, 34, 30, 0.26)')
  for (let i = 0; i < 46; i++) {
    const turn = next() * Math.PI * 2
    const far = Math.sqrt(next())
    const sun = 0.5 - Math.cos(turn) * far * 0.4 + (next() - 0.5) * 0.3
    dab(g, w / 2 + Math.cos(turn) * far * w * 0.34, base - 2.4 + Math.sin(turn) * far * 3.4, 1.3, 0.75, css(mix([54, 90, 46], [118, 146, 68], sun)), next() * Math.PI)
  }
  blades(g, w / 2, base, 7, w * 0.3, h * 0.42, next)
  const kinds = BLOOMS[(variant - 1) % BLOOMS.length]
  for (let i = 0; i < 8; i++) {
    const x = w / 2 + (next() - 0.5) * w * 0.62
    const y = base - 3 - next() * h * 0.36
    const colour = kinds[i % 2]
    const size = 1 + next() * 0.5
    // five petals around a heart
    for (let k = 0; k < 5; k++) dab(g, x + Math.cos((k / 5) * Math.PI * 2) * size * 0.7, y + Math.sin((k / 5) * Math.PI * 2) * size * 0.5, size * 0.55, size * 0.45, css(mix(colour, [255, 255, 255], k < 2 ? 0.25 : 0)))
    dab(g, x, y, size * 0.36, size * 0.3, 'rgb(214, 140, 50)')
  }
}

/** A blade or two between stones: used by other pictures. */
export function sprig(g: Ctx, x: number, base: number, next: () => number): void {
  shape(g, [[x - 0.4, base], [x + 0.4, base], [x + (next() - 0.5) * 2, base - 2.4 - next() * 2]], css(BLADES[Math.floor(next() * 3)]))
}
