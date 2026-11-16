// Opens the fixed test scene (scene.json) in a headless Chrome, takes a picture of it and saves it beside the
// target picture docs/ziel/zielbild.jpg as one comparison picture.
//
//   npm run compare                 -> docs/ziel/aktuell.png and docs/ziel/vergleich.jpg
//   npm run compare -- phase1       -> docs/ziel/aktuell-phase1.png and docs/ziel/vergleich-phase1.jpg
//   npm run compare -- phase1 --zoom=1.4 --x=2 --y=-1   tries another camera without editing scene.json
//   npm run compare -- abend --tick=430                  the same town at another game time (430 is evening)
//   npm run compare -- bot --bot                         the town the bot plays instead of the one built after the target
//
// Everything runs on this computer: its own Vite dev server, the Chrome that is installed, no service from outside.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'
import { createServer } from 'vite'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../..')
const targetFile = path.join(root, 'docs/ziel/zielbild.jpg')
const scene = JSON.parse(fs.readFileSync(path.join(here, 'scene.json'), 'utf8'))

const args = process.argv.slice(2)
const label = args.find((arg) => !arg.startsWith('--'))
if (args.includes('--bot')) {
  scene.town = false
  Object.assign(scene.camera, scene.botCamera)
}
for (const arg of args) {
  const match = /^--(zoom|x|y|tick)=(-?[\d.]+)$/.exec(arg)
  if (!match) continue
  if (match[1] === 'tick') scene.tick = Number(match[2])
  else scene.camera[{ zoom: 'zoom', x: 'fromKontorX', y: 'fromKontorY' }[match[1]]] = Number(match[2])
}
const suffix = label ? `-${label}` : ''
const shotFile = path.join(root, `docs/ziel/aktuell${suffix}.png`)
const compareFile = path.join(root, `docs/ziel/vergleich${suffix}.jpg`)

const CHROME_PATHS = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
]
const chrome = CHROME_PATHS.find((file) => file && fs.existsSync(file))
if (!chrome) throw new Error('No Chrome found. Set CHROME_PATH to the browser to use.')
if (!fs.existsSync(targetFile)) throw new Error(`The target picture is missing: ${targetFile}`)

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function clickButton(page, pattern) {
  const found = await page.evaluate((source) => {
    const re = new RegExp(source, 'i')
    const button = [...document.querySelectorAll('button')].find((b) => re.test(b.textContent ?? '') || re.test(b.getAttribute('aria-label') ?? ''))
    button?.click()
    return Boolean(button)
  }, pattern)
  if (!found) throw new Error(`Button not found: ${pattern}`)
}

/** The game picture of the test scene as PNG bytes. */
async function shootScene(browser, url) {
  const page = await browser.newPage()
  await page.setViewport(scene.viewport)
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'language', { get: () => 'de-DE' })
    Object.defineProperty(navigator, 'languages', { get: () => ['de-DE'] })
  })
  page.on('pageerror', (error) => console.log('page error:', error.message))
  await page.goto(url, { waitUntil: 'networkidle0' })
  // the saved game of the scene: the bot plays the seed, then the game is stopped
  await page.evaluate(async ({ seed, minutes, tick, town }) => {
    const { saveState } = await import('/src/save/saveGame.ts')
    const { setSpeed } = await import('/src/sim/tick.ts')
    // the town that was built by hand after the target picture, or (with --bot) the one the bot plays
    const state = town ? (await import('/tests/scene/targetTown.ts')).targetTown(seed) : setSpeed((await import('/tests/bot/run.ts')).playthrough(seed, minutes).state, 0)
    await saveState(tick === undefined ? state : { ...state, tick }, 'autosave')
  }, scene)
  await page.reload({ waitUntil: 'networkidle0' })
  await clickButton(page, 'Weiterspielen')
  await page.waitForFunction(() => Boolean(window.__mapRenderer), { timeout: 20000 })
  await wait(1500)
  const keep = scene.keep.map((selector) => `:not(${selector})`).join('')
  await page.addStyleTag({ content: `#root > *${keep} { display: none !important }` })
  // the camera of the scene
  await page.evaluate(async ({ camera }) => {
    const { tileToWorld } = await import('/src/render/iso.ts')
    const { loadState } = await import('/src/save/saveGame.ts')
    const state = await loadState('autosave')
    const kontor = state.islands[0].buildings.find((b) => b.type === 'kontor')
    const renderer = window.__mapRenderer
    const canvas = document.querySelector('.map-canvas')
    // the renderer starts at zoom 1, so this factor is the zoom of the scene
    renderer.zoomAt(camera.zoom, canvas.clientWidth / 2, canvas.clientHeight / 2)
    const at = tileToWorld(kontor.x + camera.fromKontorX, kontor.y + camera.fromKontorY)
    renderer.centerOnWorld(at.x, at.y)
  }, scene)
  // the same moment every time: clouds, waves and smoke stand still
  await page.evaluate((ms) => {
    performance.now = () => ms
  }, scene.frozenTimeMs)
  await wait(2500)
  const png = await page.screenshot({ type: 'png' })
  await page.close()
  return png
}

/** Target on the left, the game on the right, both at the same size, with a caption each. */
async function combine(browser, shotPng) {
  const page = await browser.newPage()
  const width = scene.viewport.width * scene.viewport.deviceScaleFactor
  const height = scene.viewport.height * scene.viewport.deviceScaleFactor
  const bar = 56
  await page.setViewport({ width: width * 2 + 8, height: height + bar, deviceScaleFactor: 1 })
  const target = `data:image/jpeg;base64,${fs.readFileSync(targetFile).toString('base64')}`
  const shot = `data:image/png;base64,${Buffer.from(shotPng).toString('base64')}`
  const caption = label ? `Spiel (${label})` : 'Spiel'
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#111;font:600 30px system-ui;color:#eee">
    <div style="display:flex;gap:8px">
      <div><div style="height:${bar}px;line-height:${bar}px;padding-left:16px">Ziel</div><img src="${target}" style="display:block;width:${width}px;height:${height}px;object-fit:cover"></div>
      <div><div style="height:${bar}px;line-height:${bar}px;padding-left:16px">${caption}</div><img src="${shot}" style="display:block;width:${width}px;height:${height}px"></div>
    </div></body></html>`)
  await page.evaluate(() => Promise.all([...document.images].map((image) => image.decode())))
  const jpeg = await page.screenshot({ type: 'jpeg', quality: 92 })
  await page.close()
  return jpeg
}

const server = await createServer({ root, logLevel: 'error', server: { port: 5199, strictPort: false } })
await server.listen()
const url = server.resolvedUrls.local[0]
const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--lang=de-DE'] })
try {
  const shotPng = await shootScene(browser, url)
  fs.writeFileSync(shotFile, shotPng)
  fs.writeFileSync(compareFile, await combine(browser, shotPng))
  console.log(`Spiel:     ${path.relative(root, shotFile)}`)
  console.log(`Vergleich: ${path.relative(root, compareFile)}`)
} finally {
  await browser.close()
  await server.close()
}
