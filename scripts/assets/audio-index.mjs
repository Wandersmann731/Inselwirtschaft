// Writes public/audio/index.json: which sound files exist, so the game only asks for files that are there.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT } from './manifest.mjs'

export function writeAudioIndex() {
  const base = path.join(ROOT, 'public', 'audio')
  const index = {}
  for (const folder of ['sfx', 'loops', 'music']) {
    const dir = path.join(base, folder)
    if (!fs.existsSync(dir)) continue
    for (const file of fs.readdirSync(dir)) if (file.endsWith('.mp3')) index[file.replace(/\.mp3$/, '')] = folder
  }
  fs.mkdirSync(base, { recursive: true })
  fs.writeFileSync(path.join(base, 'index.json'), JSON.stringify(index))
  return Object.keys(index).length
}

if (process.argv[1].endsWith('audio-index.mjs')) console.log(`${writeAudioIndex()} Töne im Index`)
