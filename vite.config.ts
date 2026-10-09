import fs from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

function listFiles(dir: string, base = dir): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? listFiles(full, base) : [path.relative(base, full).split(path.sep).join('/')]
  })
}

/** Fills the build id and the list of files into the service worker after the build, so the game works offline. */
function serviceWorker(): Plugin {
  let outDir = 'dist'
  return {
    name: 'service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    writeBundle() {
      const file = path.join(outDir, 'sw.js')
      if (!fs.existsSync(file)) return
      const files = listFiles(outDir)
        .filter((name) => name !== 'sw.js' && !name.endsWith('.map') && !name.startsWith('audio/music/'))
        .map((name) => `/${name}`)
      const code = fs
        .readFileSync(file, 'utf8')
        .replace('__BUILD_ID__', Date.now().toString(36))
        .replace('"__PRECACHE__"', JSON.stringify(['/', ...files]))
        .replace("'__PRECACHE__'", JSON.stringify(['/', ...files]))
      fs.writeFileSync(file, code)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), serviceWorker()],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
