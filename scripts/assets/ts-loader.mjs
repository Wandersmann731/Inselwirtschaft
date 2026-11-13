// Lets the asset scripts use the game's own picture code (src/render/*.ts): TypeScript files are turned into
// JavaScript when they are imported, imports without an extension find their .ts file, and JSON is read as data.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire, registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
const ts = createRequire(path.join(ROOT, 'package.json'))('typescript')

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:') && !path.extname(specifier)) {
      const base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier)
      for (const file of [`${base}.ts`, path.join(base, 'index.ts')]) {
        if (fs.existsSync(file)) return { url: pathToFileURL(file).href, shortCircuit: true }
      }
    }
    return next(specifier, context)
  },
  load(url, context, next) {
    if (url.endsWith('.ts')) {
      const source = fs.readFileSync(fileURLToPath(url), 'utf8')
      const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
      return { format: 'module', source: outputText, shortCircuit: true }
    }
    if (url.endsWith('.json') && context.importAttributes?.type !== 'json') {
      return { format: 'module', source: `export default ${fs.readFileSync(fileURLToPath(url), 'utf8')}`, shortCircuit: true }
    }
    return next(url, context)
  },
})
