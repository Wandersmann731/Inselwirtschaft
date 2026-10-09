// Minimal MCP stdio client for the ImageGen VS Code extension's server (newline-delimited JSON-RPC).
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

/** The newest installed ImageGen extension. */
export function findExtension() {
  const dir = path.join(process.env.HOME, '.vscode', 'extensions')
  const found = fs.readdirSync(dir).filter((name) => name.startsWith('marquaye.vscode-imagegen-')).sort()
  if (found.length === 0) throw new Error('The ImageGen extension (marquaye.vscode-imagegen) is not installed')
  return path.join(dir, found[found.length - 1])
}

export function startServer({ workspace, provider, outputDir }) {
  const env = {
    ...process.env,
    IMAGEGEN_WORKSPACE_DIR: workspace,
    IMAGEGEN_OUTPUT_DIRECTORY: outputDir,
    IMAGEGEN_PROVIDER: provider,
    IMAGEGEN_REQUEST_TIMEOUT_MS: '150000',
  }
  // The server reads GEMINI_API_KEY, the shell may only have GOOGLE_API_KEY. The value is never printed.
  if (!env.GEMINI_API_KEY && env.GOOGLE_API_KEY) env.GEMINI_API_KEY = env.GOOGLE_API_KEY
  // The server finds its WebP encoder relative to the working directory, so it starts inside the extension.
  const child = spawn('node', ['mcp/server.js'], { cwd: path.join(findExtension(), 'dist'), env, stdio: ['pipe', 'pipe', 'pipe'] })
  let buffer = ''
  const waiting = new Map()
  let id = 0
  child.stdout.on('data', (chunk) => {
    buffer += chunk
    let newline
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).trim()
      buffer = buffer.slice(newline + 1)
      if (!line) continue
      try {
        const message = JSON.parse(line)
        if (message.id !== undefined && waiting.has(message.id)) {
          waiting.get(message.id)(message)
          waiting.delete(message.id)
        }
      } catch {
        /* not JSON */
      }
    }
  })
  const request = (method, params, timeoutMs = 240000) =>
    new Promise((resolve, reject) => {
      const myId = ++id
      const timer = setTimeout(() => {
        waiting.delete(myId)
        reject(new Error(`timeout: ${method}`))
      }, timeoutMs)
      waiting.set(myId, (message) => {
        clearTimeout(timer)
        resolve(message)
      })
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: myId, method, params }) + '\n')
    })
  const call = async (name, args) => {
    const response = await request('tools/call', { name, arguments: args })
    const text = response.result?.content?.[0]?.text ?? JSON.stringify(response.error ?? response)
    try {
      const parsed = JSON.parse(text)
      if (parsed.absolutePath) return parsed
    } catch {
      /* plain text error */
    }
    throw new Error(text.slice(0, 300))
  }
  return {
    async init() {
      await request('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'claude-code', version: '1' } })
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }) + '\n')
    },
    generate: (args) => call('generate_image', args),
    edit: (args) => call('edit_image', args),
    close: () => child.kill(),
  }
}
