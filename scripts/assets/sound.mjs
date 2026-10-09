#!/usr/bin/env node
// Makes the game sounds from docs/ton.csv with the ElevenLabs Sound Effects API and saves MP3 files in public/audio.
//
//   ELEVENLABS_API_KEY=... node scripts/assets/sound.mjs [--kind sfx,loop] [--group "Oberfläche"] [--only id,id] [--force] [--parallel 4] [--dry]
//
// The key is only read from the environment and never written to a file.
import fs from 'node:fs'
import path from 'node:path'
import { writeAudioIndex } from './audio-index.mjs'
import { ROOT } from './manifest.mjs'

const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}
const split = (value) => value?.split(',').filter(Boolean)

const key = process.env.ELEVENLABS_API_KEY
const kinds = split(option('kind', 'sfx,loop'))
const groups = split(option('group', ''))
const only = split(option('only', ''))
const parallel = Number(option('parallel', '4'))
const OUT = path.join(ROOT, 'public', 'audio')
const FOLDER = { sfx: 'sfx', loop: 'loops', music: 'music' }

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ';') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.length > 1) rows.push(row)
      row = []
    } else field += c
  }
  if (field || row.length) rows.push([...row, field])
  return rows
}

const [, ...rows] = parseCsv(fs.readFileSync(path.join(ROOT, 'docs', 'ton.csv'), 'utf8'))
let jobs = rows.map(([id, group, kind, , seconds, priority, when, prompt]) => ({ id, group, kind, seconds: Number(seconds), priority: Number(priority), when, prompt }))
jobs = jobs.filter((job) => kinds.includes(job.kind))
if (groups?.length) jobs = jobs.filter((job) => groups.includes(job.group))
if (only?.length) jobs = jobs.filter((job) => only.includes(job.id))
const target = (job) => path.join(OUT, FOLDER[job.kind], `${job.id}.mp3`)
if (!flag('force')) jobs = jobs.filter((job) => !fs.existsSync(target(job)))
console.log(`${jobs.length} Töne, ${parallel} parallel`)
if (flag('dry')) {
  for (const job of jobs) console.log(`${job.id} [${job.kind}] ${job.seconds}s: ${job.prompt.slice(0, 100)}`)
  process.exit(0)
}
if (!key) {
  console.error('ELEVENLABS_API_KEY fehlt in der Umgebung.')
  process.exit(1)
}

async function make(job) {
  const body = {
    text: job.prompt,
    duration_seconds: Math.max(0.5, Math.min(30, job.seconds)),
    prompt_influence: job.kind === 'loop' ? 0.6 : 0.5,
    model_id: 'eleven_text_to_sound_v2',
    ...(job.kind === 'loop' ? { loop: true } : {}),
  }
  const response = await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128', {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  fs.mkdirSync(path.dirname(target(job)), { recursive: true })
  fs.writeFileSync(target(job), bytes)
  return bytes.length
}

const queue = [...jobs]
const failures = []
let done = 0
async function worker() {
  while (queue.length > 0) {
    const job = queue.shift()
    let note = ''
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        note = `${Math.round((await make(job)) / 1024)} KB`
        break
      } catch (error) {
        note = `Fehler: ${error.message}`
        if (/HTTP (401|402|403)/.test(error.message)) { queue.length = 0; attempt = 3 }
        if (attempt === 3) failures.push(job.id)
        else await new Promise((resolve) => setTimeout(resolve, 3000 * attempt))
      }
    }
    done++
    console.log(`[${done}/${jobs.length}] ${job.id} ${job.seconds}s ${note}`)
  }
}
await Promise.all(Array.from({ length: Math.min(parallel, jobs.length || 1) }, worker))
console.log(failures.length ? `Fehlgeschlagen: ${failures.join(', ')}` : 'Alles fertig')
writeAudioIndex()
