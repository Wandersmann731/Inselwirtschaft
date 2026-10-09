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

/** Field buildings: flat ground with a small building, not a raised block. */
const WORKSHOPS = new Set(['brewery', 'saltworks', 'butcher', 'hunting_lodge', 'marble_mason', 'weaver', 'bakery', 'mill', 'stonemason', 'smelter', 'toolmaker', 'distillery', 'tannery', 'tobacco_factory', 'dyer', 'oil_boiler', 'winery', 'goldsmith', 'market_house'])
const PLOTS = new Set(['forester', 'fishery', 'quarry', 'ore_mine', 'salt_mine', 'gold_mine', 'gem_mine', 'marble_quarry', ...WORKSHOPS])
const MINES = new Set(['quarry', 'ore_mine', 'salt_mine', 'gold_mine', 'gem_mine', 'marble_quarry'])
const FARMS = new Set([
  'cotton_plantation', 'sheep_farm', 'potato_farm', 'tobacco_plantation', 'hops_farm', 'spice_plantation',
  'grain_farm', 'sugar_plantation', 'vineyard', 'silk_plantation', 'indigo_farm', 'cattle_farm',
])

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
    // variants (house_pioneers_3, farm_2 ...) share the guide of their base building
    const base = id === 'scaffold_2x2' ? 'house_pioneers' : id.replace(/_\d+$/, '')
    job.guide = `docs/vorlagen/buildings/${base}_guide.png`
    job.prompt =
      `Turn the grey isometric block on the magenta background into ${desc}. ` +
      'Keep the exact silhouette, size, position and 2:1 isometric perspective of the block: the building must stand on the diamond-shaped ground area, fill the block volume and not extend beyond it, a roof may overhang only slightly. Do not draw any outline, frame or hexagon around the building. Draw no smoke and no steam (it is added later by the game). ' +
      `${STYLE} Keep the flat magenta background (#FF00FF) completely empty and use no magenta or pink colour in the building. No text, no people.`
    if (base.startsWith('house_') || FARMS.has(base) || PLOTS.has(base)) job.cutSlab = true
    // the ground of houses and workshops is toned down towards the meadow of the game, so plots do not look like bright tiles
    if ((base.startsWith('house_') && base !== 'house_ruin') || (PLOTS.has(base) && !MINES.has(base))) job.meadow = true
    if (base.startsWith('house_') || PLOTS.has(base)) {
      job.prompt =
        `Turn the grey diamond on the magenta background into the small flat plot of land of a house, and the grey box into ${desc}. ` +
        'The plot is flat and ends exactly at the edges of the diamond: no raised slab, no thickness, no earth cross-section, no side walls, no plinth and no outline around the diamond. The ground covers the whole diamond out to all four corners, including the far left and far right corner: the shape of the ground is a rhombus, never a hexagon and never cut off at the corners. ' +
        'The house stands in the middle of the plot and is clearly smaller than the plot, so that neighbouring houses never touch: the house itself must not reach the corners of the diamond. ' +
        `${STYLE} Keep the flat magenta background (#FF00FF) completely empty and use no magenta or pink colour. No text, no people. Draw no smoke.` +
        (WORKSHOPS.has(base)
          ? ' The ground of the plot is a small work yard of packed earth with a few cobblestones, crates and tools, with a grassy fringe and no hard border, so that it blends into its surroundings. The building is in the middle and clearly smaller than the plot.'
          : MINES.has(base)
          ? ' The ground of the plot is bare grey-brown rock, gravel and a few small boulders with no hard border, and the working is cut into a rocky slope, so that it blends into the surrounding mountain.'
          : PLOTS.has(base)
            ? ' The ground of the plot is natural: grass, leaf litter, soil, a few stumps or sand, with no hard border, so that it can blend into the surrounding forest or shore.'
            : '')
    } else if (FARMS.has(base)) {
      job.prompt =
        `Turn the flat grey diamond on the magenta background into ${desc}. The grey box at the back corner becomes the small farm building. ` +
        'The ground must be perfectly flat and end exactly at the edges of the diamond: no raised slab, no thickness, no earth cross-section, no side walls, no plinth, no outline around the diamond. ' +
        `The rows and plants follow the two isometric grid directions of the diamond. ${STYLE} ` +
        'Keep the flat magenta background (#FF00FF) completely empty and use no magenta or pink colour. No text, no people.'
    } else if (FOUNDATION[id]) {
      job.prompt += ` The grey block is only a volume guide: none of its plain grey, white or beige side walls may remain. The sides of the base must be ${FOUNDATION[id]}.`
    }
  } else if (dir === 'terrain' && id.startsWith('water_')) {
    // Water is animated: all frames are made from one generated texture so the waves flow on and loop.
    job.kind = 'water'
    job.derivedFrom = 'water_texture'
    job.frame = Number(id.split('_')[1]) - 1
    job.frames = 8
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
  } else if (dir === 'decor') {
    job.kind = 'decor'
    job.prompt = fullPrompt
  } else if (dir === 'ground') {
    job.kind = 'ground'
    job.prompt = fullPrompt
  } else if (dir === 'icons') {
    job.kind = 'icon'
    job.prompt = fullPrompt
  } else if (dir === 'ships' || dir === 'effects') {
    job.kind = 'sprite'
    job.prompt = fullPrompt
    if (id === 'ship_top' || id === 'island_icon' || id.startsWith('smoke_')) {
      job.prompt = `${desc}, game sprite, centred, simple bold shapes, thick dark-brown outline, saturated colours, plain flat magenta background (#FF00FF), no text, no frame, no watermark, hand-painted cel-shaded`
    }
    if (id.startsWith('smoke_')) {
      // Smoke is animated from three generated puffs that rise, grow and fade, so the loop is seamless.
      job.kind = 'smoke'
      job.derivedFrom = 'smoke_puff_1'
      job.frame = Number(id.split('_')[1]) - 1
      job.frames = 12
    }
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
  if (jobs.some((job) => job.kind === 'water')) {
    jobs.unshift({
      id: 'water_texture',
      group: 'Gelände',
      file: 'terrain/_water_texture.png',
      width: 512,
      height: 512,
      kind: 'texture',
      aspectRatio: '1:1',
      desc: 'water texture',
      prompt:
        'Flat texture of calm blue sea water seen straight from above (orthographic, no perspective): a few large soft lighter wave crest lines flowing across a medium blue surface, ' +
        'hand-painted cel-shaded with gentle highlights, fills the whole square image edge to edge, no objects, no foam at the borders, no text, no frame',
    })
  }
  if (jobs.some((job) => job.kind === 'smoke')) {
    for (let n = 1; n <= 3; n++) {
      jobs.unshift({
        id: `smoke_puff_${n}`,
        group: 'Effekte',
        file: `effects/_puff_${n}.png`,
        width: 128,
        height: 128,
        kind: 'puff',
        aspectRatio: '1:1',
        desc: 'smoke puff',
        prompt:
          'A single round fluffy puff of light grey smoke, cartoon style with soft dark-brown outline, game sprite, centred, plain flat magenta background (#FF00FF), no text, no frame, no watermark' +
          (n === 2 ? ', slightly wider than tall' : n === 3 ? ', slightly lopsided with a little swirl' : ''),
      })
    }
  }
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
