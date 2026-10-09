// Reads docs/grafiken.csv and turns each line into a job for generate.mjs.
import fs from 'node:fs'
import path from 'node:path'

export const ROOT = path.resolve(import.meta.dirname, '..', '..')

const STYLE =
  'Hand-painted cel-shaded look with clean dark-brown outlines and soft saturated colours, light from the top left, no cast shadow on the ground.'

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ';') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.length > 1) rows.push(row)
      row = []
    } else field += c
  }
  if (field || row.length) rows.push([...row, field])
  return rows
}

/** Extra hints for buildings where the model kept the grey guide block as plain walls. */
const FOUNDATION = {
  cotton_plantation: 'a brown earth cross-section with a thin grass edge and small stones',
  sheep_farm: 'a brown earth cross-section with a thin grass edge and small stones',
  potato_farm: 'a dark brown earth cross-section with a thin grass edge and small stones',
  tobacco_plantation: 'a brown earth cross-section with a thin grass edge and small stones',
  hops_farm: 'a brown earth cross-section with a thin grass edge and small stones',
  spice_plantation: 'a brown earth cross-section with a thin grass edge and small stones',
  church: 'the church walls themselves reach down to the edges of the diamond, so the church forms the whole volume',
  shipyard: 'a foundation of weathered wooden planks and stone',
  bathhouse: 'a foundation of cream-coloured stone blocks with columns',
}

const clean = (desc) => desc.replace(/, tileable/g, '').replace(/, variant \d+ of \d+/g, '')

function jobFor(row) {
  const [id, group, file, size, , desc, fullPrompt] = row
  const [width, height] = size.split('x').map(Number)
  const dir = file.split('/')[0]
  const job = { id, group, file, width, height, desc, fullPrompt, aspectRatio: '1:1' }
  const variant = /variant (\d+) of (\d+)/.exec(desc)

  if (dir === 'buildings' || id === 'scaffold_2x2') {
    job.kind = 'building'
    job.guide = `docs/vorlagen/buildings/${id === 'scaffold_2x2' ? 'house_pioneers' : id}_guide.png`
    job.prompt =
      `Turn the grey isometric block on the magenta background into ${desc}. ` +
      'Keep the exact silhouette, size, position and 2:1 isometric perspective of the block: the building must stand on the diamond-shaped ground area, fill the block volume and not extend beyond it, a roof may overhang only slightly. Do not draw any outline, frame or hexagon around the building. ' +
      `${STYLE} Keep the flat magenta background (#FF00FF) completely empty and use no magenta or pink colour in the building. No text, no people.`
    if (FOUNDATION[id]) {
      job.prompt += ` The grey block is only a volume guide: none of its plain grey, white or beige side walls may remain. The sides of the base must be ${FOUNDATION[id]}.`
    }
  } else if (dir === 'terrain') {
    job.kind = 'tile'
    job.guide = 'docs/vorlagen/terrain/tile_guide.png'
    job.prompt =
      `Replace the grey diamond on the magenta background with ${clean(desc)}, seen in the flat isometric diamond shape. ` +
      'The surface must run all the way to the edges of the diamond with no outline, no border and nothing crossing the edge, and nothing may be drawn outside the diamond. ' +
      (variant ? `Make it a distinct arrangement (variation ${variant[1]} of ${variant[2]}). ` : '') +
      `${STYLE} Keep the flat magenta background (#FF00FF) empty. No text.`
  } else if (dir === 'roads') {
    // The path shapes are drawn by the script from one generated cobblestone texture, so they always fit the tile.
    job.kind = 'road'
    job.derivedFrom = 'road_texture'
  } else if (dir === 'icons') {
    job.kind = 'icon'
    job.prompt = fullPrompt
  } else if (dir === 'ships' || dir === 'effects') {
    job.kind = 'sprite'
    job.prompt = fullPrompt
    if (id === 'ship_top' || id === 'island_icon' || id.startsWith('smoke_')) {
      job.prompt = `${desc}, game sprite, centred, simple bold shapes, thick dark-brown outline, saturated colours, plain flat magenta background (#FF00FF), no text, no frame, no watermark, hand-painted cel-shaded`
    }
    if (id.startsWith('smoke_')) job.aspectRatio = '2:3'
  } else if (dir === 'app') {
    job.kind = 'app'
    job.prompt = fullPrompt
    if (id === 'splash') job.aspectRatio = '16:9'
    if (id === 'logo') {
      job.aspectRatio = '16:9'
      job.prompt =
        'Game title logo with the single word "Inselwirtschaft" in bold carved wooden sign letters with a small anchor, hand-painted cel-shaded look with dark-brown outlines, plain flat magenta background (#FF00FF), no other text, no frame, no watermark'
    }
    if (id === 'icon_192' || id === 'icon_maskable_512') job.derivedFrom = 'icon_512'
  }
  return job
}

export function loadJobs() {
  const text = fs.readFileSync(path.join(ROOT, 'docs', 'grafiken.csv'), 'utf8')
  const rows = parseCsv(text).slice(1)
  const jobs = rows.map(jobFor)
  if (jobs.some((job) => job.kind === 'road')) {
    jobs.unshift({
      id: 'road_texture',
      group: 'Straßen',
      file: 'roads/_texture.png',
      width: 512,
      height: 512,
      kind: 'texture',
      aspectRatio: '1:1',
      desc: 'cobblestone texture',
      prompt:
        'Flat seamless texture of a cobblestone path with packed brown earth between the stones, seen straight from above (orthographic, no perspective), ' +
        'hand-painted cel-shaded with soft dark-brown outlines around the stones and warm earthy colours, fills the whole square image edge to edge, no objects, no text, no border',
    })
  }
  return jobs
}
