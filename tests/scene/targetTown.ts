// The town of the comparison picture (docs/ziel/zielbild.jpg), built by hand for `npm run compare`: a trading post
// at the shore, a quarter of town houses behind it, two villas further back, cottages with their gardens at the
// edge, a forester's yard under the trees of a wood. It is no game anybody played: the houses are simply set down
// with the tier they should show, so that the picture of the game can be held against the target.
import { goods } from '../../src/data'
import { placeBuilding, placeRoads } from '../../src/sim/build'
import { fromIslandState, toIslandState } from '../../src/sim/islands'
import { createNewGame } from '../../src/sim/newGame'
import type { GameState, IslandState } from '../../src/sim/state'
import { setSpeed } from '../../src/sim/tick'
import { createHouse, cumulativeNeeds, getTier } from '../../src/sim/tiers'
import { Terrain } from '../../src/world/terrain'

/** What stands where, in tiles from the first tile of the trading post: [building or tier of a house, across, down]. */
export const TOWN: [string, number, number][] = [
  // the row behind the quay
  ['merchants', 3, -3], ['citizens', 6, -3], ['merchants', 9, -3],
  // the row behind the street
  ['citizens', 1, -6], ['merchants', 4, -6], ['merchants', 7, -6], ['citizens', 10, -6],
  // the villas, and what stands beside them
  ['settlers', 0, -9], ['aristocrats', 3, -9], ['aristocrats', 6, -9], ['citizens', 9, -9], ['citizens', 12, -9],
  // cottages at the edge of the town and by the wood
  ['pioneers', 9, -12], ['pioneers', -3, -6], ['settlers', 3, -12], ['settlers', 12, -12],
  ['forester', -4, -3], ['sheep_farm', 6, -12], ['fishery', 3, 0],
]
/** Streets, as runs of tiles: [from across, from down, to across, to down]. */
export const STREETS: [number, number, number, number][] = [[2, -4, 11, -4], [2, -1, 2, -3], [-1, -7, 12, -7], [-1, -6, -1, -4], [0, -4, 1, -4], [2, -10, 14, -10]]
/** The wood: tiles of grass in these boxes become forest [from across, from down, to across, to down]. */
export const WOODS: [number, number, number, number][] = [[-16, -16, -6, -1], [-5, -16, -2, -9], [-5, -2, -3, -1], [15, -16, 19, -11], [5, -16, 12, -15]]
/** Houses (by their place in TOWN) whose residents lack something: they carry the red mark of the target picture. */
const IN_NEED = [1, 5]

/** A house of a tier, full of people who have all they need (or, `lacking`, no food). */
function housed(tier: string, lacking: boolean): NonNullable<IslandState['buildings'][number]['house']> {
  const needs: Record<string, number> = {}
  for (const need of cumulativeNeeds(tier)) needs[need.id] = 100
  if (lacking) needs.food = 0
  return { ...createHouse(tier), residents: getTier(tier).residents, needs }
}

/** The game with the town standing on the home island of `seed`, paused. Buildings that find no ground are left out. */
export function targetTown(seed = 1): GameState {
  const game = createNewGame(seed, 1e9)
  let island = toIslandState(game, game.islands[0].id)
  const post = island.buildings.find((b) => b.type === 'kontor')
  if (!post) return game
  const { width, height } = island.map
  // the wood first: what grows follows from the ground
  const tiles = island.map.tiles.slice()
  for (const [x0, y0, x1, y1] of WOODS) {
    for (let y = post.y + y0; y <= post.y + y1; y++) {
      for (let x = post.x + x0; x <= post.x + x1; x++) {
        if (x >= 0 && y >= 0 && x < width && y < height && tiles[y * width + x] === Terrain.Grass) tiles[y * width + x] = Terrain.Forest
      }
    }
  }
  const stock = { ...island.stock }
  for (const good of goods) stock[good.id] = 9999
  island = { ...island, map: { ...island.map, tiles }, stock }
  TOWN.forEach(([what, dx, dy], index) => {
    const tier = ['pioneers', 'settlers', 'citizens', 'merchants', 'aristocrats'].includes(what) ? what : null
    const before = island.buildings.length
    island = placeBuilding(island, tier ? 'house_pioneers' : what, post.x + dx, post.y + dy, false, true)
    if (island.buildings.length === before) return
    const built = island.buildings[island.buildings.length - 1]
    const done = { ...built }
    if (tier) done.house = housed(tier, IN_NEED.includes(index))
    // a workshop at work: no mark over it, smoke from its chimney
    if (done.production) done.production = { ...done.production, status: { kind: 'producing' } }
    island = { ...island, buildings: [...island.buildings.slice(0, -1), done] }
  })
  const road: { x: number; y: number }[] = []
  for (const [x0, y0, x1, y1] of STREETS) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) road.push({ x: post.x + x, y: post.y + y })
  }
  island = placeRoads(island, road)
  return setSpeed(fromIslandState(game, island), 0)
}
