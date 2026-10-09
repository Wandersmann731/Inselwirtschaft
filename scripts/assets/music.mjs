#!/usr/bin/env node
// Makes the music tracks from docs/ton.csv with Google Lyria 3 Pro through OpenRouter and saves MP3 files in public/audio/music.
// (The ElevenLabs key has no music permission, and Lyria makes full-length songs for about 0.08 USD each.)
//
//   OPENROUTER_API_KEY=... node scripts/assets/music.mjs [--only id,id] [--force]
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
const only = option('only', '')?.split(',').filter(Boolean)
const key = process.env.OPENROUTER_API_KEY
const MODEL = 'google/lyria-3-pro-preview'
const OUT = path.join(ROOT, 'public', 'audio', 'music')

function lines(text) {
  return text.split(/\r?\n/).filter(Boolean)
}
// the music rows of the CSV: id;gruppe;art;datei;dauer;prio;wann;prompt (no quotes with semicolons inside)
const rows = lines(fs.readFileSync(path.join(ROOT, 'docs', 'ton.csv'), 'utf8')).slice(1)
let jobs = rows
  .map((line) => line.split(';'))
  .filter((cells) => cells[2] === 'music')
  .map((cells) => ({ id: cells[0], seconds: Number(cells[4]), prompt: cells[7].replace(/^"|"$/g, '') }))
if (only?.length) jobs = jobs.filter((job) => only.includes(job.id))
jobs = jobs.filter((job) => flag('force') || !fs.existsSync(path.join(OUT, `${job.id}.mp3`)))
console.log(`${jobs.length} Musikstücke`)
if (jobs.length > 0 && !key) {
  console.error('OPENROUTER_API_KEY fehlt in der Umgebung.')
  process.exit(1)
}

async function make(job) {
  const prompt = `${job.prompt}. Full length, about ${Math.round(job.seconds / 60)} minutes, no vocals, ends so that it can loop back to the beginning.`
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, modalities: ['text', 'audio'], stream: true, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`)
  const chunks = []
  const decoder = new TextDecoder()
  let buffer = ''
  for await (const part of response.body) {
    buffer += decoder.decode(part, { stream: true })
    let newline
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim()
      buffer = buffer.slice(newline + 1)
      if (!line.startsWith('data:') || line.includes('[DONE]')) continue
      try {
        const json = JSON.parse(line.slice(5))
        if (json.error) throw new Error(JSON.stringify(json.error).slice(0, 200))
        const audio = json.choices?.[0]?.delta?.audio
        if (audio?.data) chunks.push(Buffer.from(audio.data, 'base64'))
      } catch (error) {
        if (error instanceof SyntaxError) continue
        throw error
      }
    }
  }
  const bytes = Buffer.concat(chunks)
  if (bytes.length < 50000) throw new Error('no audio received')
  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, `${job.id}.mp3`), bytes)
  return bytes.length
}

for (const job of jobs) {
  const started = Date.now()
  let note = ''
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      note = `${(await make(job) / 1e6).toFixed(1)} MB`
      break
    } catch (error) {
      note = `Fehler: ${error.message}`
    }
  }
  console.log(`${job.id} ${Math.round((Date.now() - started) / 1000)}s ${note}`)
}
writeAudioIndex()
