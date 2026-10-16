import { buildings, chains, climates, goods, landNames, tiers } from '../data'

/** English names of the game data by id. The German names stay in the JSON files. */
const EN: Record<string, Record<string, string>> = {
  goods: {
    tools: 'Tools', wood: 'Wood', bricks: 'Bricks', marble: 'Marble', stone: 'Stone', ore: 'Iron ore', iron: 'Iron', wool: 'Wool',
    cotton: 'Cotton', cloth: 'Cloth', leather: 'Leather', grain: 'Grain', flour: 'Flour', food: 'Food', alcohol: 'Alcohol', salt: 'Salt',
    tobacco: 'Tobacco', spices: 'Spices', silk: 'Silk fabric', lamp_oil: 'Lamp oil', jewelry: 'Jewelry', wine: 'Wine', hides: 'Hides',
    hops: 'Hops', sugar: 'Sugar cane', tobacco_leaf: 'Tobacco leaves', raw_silk: 'Raw silk', blubber: 'Blubber', gold: 'Gold',
    gems: 'Gems', saltstone: 'Rock salt', marble_stone: 'Marble block', cattle: 'Cattle', dye: 'Dye',
  },
  buildings: {
    house_pioneers: 'Pioneer house', house_aristocrats: 'Aristocrat house', food_salt_stand: 'Food/salt stall', cloth_stand: 'Clothing stall',
    chapel: 'Chapel', tavern: 'Tavern', church: 'Church', bathhouse: 'Bathhouse', theater: 'Theatre', cathedral: 'Cathedral',
    drink_stand: 'Drinks stall', tobacco_spice_stand: 'Tobacco/spice stall', lamp_oil_stand: 'Lamp oil stall', jewelry_stand: 'Jewelry stall',
    forester: "Forester's hut", quarry: 'Quarry', ore_mine: 'Ore mine', weaver: 'Weaver', sheep_farm: 'Sheep farm',
    cotton_plantation: 'Cotton plantation', fishery: 'Fishery', grain_farm: 'Grain farm', mill: 'Mill', bakery: 'Bakery',
    stonemason: 'Stonemason', smelter: 'Ore smelter', toolmaker: 'Toolmaker', salt_mine: 'Salt mine', saltworks: 'Saltworks',
    potato_farm: 'Potato farm', distillery: 'Rum distillery', brewery: 'Brewery', hops_farm: 'Hops farm', sugar_plantation: 'Sugar cane plantation',
    cattle_farm: 'Cattle farm', butcher: 'Butcher', hunting_lodge: 'Hunting lodge', tannery: 'Tannery', tobacco_plantation: 'Tobacco plantation',
    tobacco_factory: 'Tobacco factory', spice_plantation: 'Spice plantation', silk_plantation: 'Silk plantation', indigo_farm: 'Indigo farm',
    dyer: 'Dyeworks', whaler: 'Whaler', oil_boiler: 'Oil boiler', vineyard: 'Vineyard', gold_mine: 'Gold mine', gem_mine: 'Gem mine',
    marble_quarry: 'Marble quarry', marble_mason: 'Marble mason', goldsmith: 'Goldsmith', road: 'Road', kontor: 'Trading post',
    market_house: 'Market house', shipyard: 'Shipyard',
  },
  tiers: { pioneers: 'Pioneers', settlers: 'Settlers', citizens: 'Citizens', merchants: 'Merchants', aristocrats: 'Aristocrats' },
  climates: {
    polar: 'Polar zone', tundra: 'Tundra zone', north: 'Northern zone', prairie: 'Prairie zone', steppe: 'Steppe zone', jungle: 'Jungle zone',
  },
  chains: {
    wood: 'Wood', bricks: 'Bricks', tools: 'Tools', marble: 'Marble', fish: 'Fish', bread: 'Bread', meat: 'Meat and game', leather: 'Leather',
    cloth: 'Cloth', salt: 'Salt', alcohol: 'Alcohol', tobacco: 'Tobacco', spices: 'Spices', silk: 'Silk', lamp_oil: 'Lamp oil',
    wine: 'Wine', jewelry: 'Jewelry',
  },
  fertilities: {
    forest: 'Forest', cattle: 'Pasture for cattle', sheep: 'Sheep pasture', grain: 'Grain farming', potatoes: 'Potato farming',
    hops: 'Hops farming', wine: 'Wine growing', cotton: 'Cotton farming', tobacco: 'Tobacco farming', spices: 'Spice farming',
    sugar: 'Sugar cane farming', silk: 'Silk farming', indigo: 'Indigo farming', whales: 'Whaling', game: 'Game',
  },
  deposits: { stone: 'Stone', ore: 'Iron ore', salt: 'Salt', gold: 'Gold', gems: 'Gems', marble: 'Marble' },
}

type Named = { id: string; name: string }
const TARGETS: [string, Named[]][] = [
  ['goods', goods],
  ['buildings', buildings],
  ['tiers', tiers],
  ['climates', climates],
  ['chains', chains],
  ['fertilities', landNames.fertilities],
  ['deposits', landNames.deposits],
]

const german = new Map<Named, string>()

/** Switches the `name` of all game data between German (the JSON) and English. */
export function applyDataLanguage(language: 'de' | 'en'): void {
  for (const [kind, list] of TARGETS) {
    for (const entry of list) {
      if (!german.has(entry)) german.set(entry, entry.name)
      entry.name = language === 'en' ? (EN[kind][entry.id] ?? german.get(entry)!) : german.get(entry)!
    }
  }
}
