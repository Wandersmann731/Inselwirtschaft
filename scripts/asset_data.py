"""Shared data of the asset scripts: tile size, building descriptions and heights above ground."""

TILE_W, TILE_H = 128, 64  # 2x resolution of the 64x32 game tile

# --- descriptions: building id -> (English description, height above ground at 2x in px) -----------
B = {
    "house_pioneers": ("small simple wooden settler hut with a thatched roof, rough timber walls, one door, tiny chimney", 96),
    "house_settlers": ("timber-framed cottage with whitewashed plaster walls, wooden shingle roof, small fenced garden", 112),
    "house_citizens": ("two-storey half-timbered townhouse with red clay tile roof and shuttered windows", 144),
    "house_merchants": ("stately three-storey merchant house with stone ground floor, gabled tile roof, balcony and a trade sign", 160),
    "house_aristocrats": ("elegant manor house of cream-coloured stone with a slate mansard roof, columns and ornamental dormers", 176),
    "house_ruin": ("collapsed, burnt-out ruin of a stately house with broken walls and charred beams, no roof, a little smoke", 64),
    "food_salt_stand": ("small market stall with a striped awning, baskets of bread, fish and sacks of salt", 64),
    "cloth_stand": ("small market stall with striped awning, rolls of cloth, leather hides and bolts of silk", 64),
    "drink_stand": ("small market stall with barrels, bottles of spirits and wine, striped awning", 64),
    "tobacco_spice_stand": ("small market stall with bundles of tobacco leaves and bowls of colourful spices, striped awning", 64),
    "lamp_oil_stand": ("small market stall with oil lamps and clay oil jugs, striped awning", 64),
    "jewelry_stand": ("small elegant market stall with a velvet display of necklaces, rings and gems, fine awning", 64),
    "chapel": ("small stone chapel with a slate roof and a little bell tower", 160),
    "tavern": ("large timber inn with a hanging tankard sign, warm lit windows and barrels by the door", 160),
    "church": ("large stone church with a tall steeple, long nave, buttresses and a round rose window", 224),
    "bathhouse": ("bathhouse in classical style with a domed roof, columns, steam rising and a pool courtyard", 160),
    "theater": ("renaissance theatre with a half-round arena building, decorated facade, banners and stairs", 192),
    "cathedral": ("grand gothic cathedral with two tall towers, flying buttresses, stained glass windows", 288),
    "forester": ("forester's lodge: log cabin with stacked firewood, a saw and an axe in a stump", 96),
    "quarry": ("stone quarry cut into a rocky slope with stone blocks and a wooden crane", 112),
    "ore_mine": ("mine entrance with timber supports, an ore cart on rails and a heap of rubble", 96),
    "weaver": ("weaver's workshop with a big wooden loom visible, cloth drying on frames", 112),
    "sheep_farm": ("flat green pasture filling the whole ground with a low wooden fence around it, a few woolly sheep and a small red barn at the back corner", 80),
    "cotton_plantation": ("flat cotton field filling the whole ground: neat rows of cotton plants with white cotton bolls, a small wooden storage shed at the back corner", 80),
    "fishery": ("fisherman's hut on the shore with drying racks of fish, nets and a small rowing boat", 96),
    "grain_farm": ("flat golden wheat field filling the whole ground with a few haystacks and a small farmhouse at the back corner", 80),
    "mill": ("windmill with a timber tower, four sails and flour sacks at the door", 144),
    "bakery": ("bakery with a brick oven, a clearly visible brick chimney on the roof, loaves of bread in the window", 112),
    "stonemason": ("stonemason's yard with cut stone blocks, chisels and a small workshop", 96),
    "smelter": ("ironworks smelter with a brick furnace, a tall brick chimney on the roof and glowing molten metal", 144),
    "toolmaker": ("tool smithy with an anvil, hammers and tools hanging on the wall, forge glow and a brick chimney on the roof", 112),
    "salt_mine": ("salt mine with piles of white crystals, a wooden hoist and barrels", 96),
    "potato_farm": ("flat ploughed potato field filling the whole ground: ridged brown soil with green potato plants in rows, a small barn at the back corner", 80),
    "distillery": ("distillery with a copper still, oak barrels and a brick building with a brick chimney on the roof", 112),
    "hops_farm": ("flat hop yard filling the whole ground: rows of tall poles with green hop vines, a small drying barn at the back corner", 80),
    "sugar_plantation": ("flat sugar cane plantation filling the whole ground with rows of tall green cane and a small press shed at the back corner", 80),
    "cattle_farm": ("flat green paddock filling the whole ground with a low wooden fence, a few brown cows and a small barn at the back corner", 80),
    "tannery": ("tannery with hides stretched on frames and wooden tanning vats", 96),
    "tobacco_plantation": ("flat tobacco field filling the whole ground: rows of broad-leaf tobacco plants, a small wooden drying barn at the back corner", 80),
    "tobacco_factory": ("tobacco manufactory: workshop with hanging leaves and rolling tables", 112),
    "spice_plantation": ("flat spice plantation filling the whole ground: rows of pepper vines on short poles and colourful sacks of spices, a small hut at the back corner", 80),
    "silk_plantation": ("flat silk farm filling the whole ground: rows of mulberry bushes, white cocoons on racks and a small silkworm shed at the back corner", 80),
    "indigo_farm": ("flat indigo field filling the whole ground: rows of blue-green indigo plants, a small dye shed at the back corner", 80),
    "dyer": ("dyer's workshop with colourful blue and purple cloths drying on lines and dye vats", 112),
    "whaler": ("whaling station on a cold shore with a whale-bone arch, boiling barrels and a harpoon boat", 112),
    "oil_boiler": ("oil boilery with big iron cauldrons, barrels, dark brick walls and a tall brick chimney on the roof", 112),
    "vineyard": ("flat vineyard filling the whole ground: rows of grape vines on wires, a small press house at the back corner", 80),
    "winery": ("winery with big wooden presses and wine barrels in a stone building", 112),
    "gold_mine": ("gold mine entrance with timber supports, carts full of gold ore and gleaming nuggets", 96),
    "gem_mine": ("gemstone mine with blue and red crystals and a timber entrance", 96),
    "goldsmith": ("goldsmith's workshop with a display of gold jewellery and a small furnace", 112),
    "kontor": ("harbour trading post: wooden warehouse on a short pier with crates, barrels and a flag", 128),
    "market_house": ("market house: open-sided hall with arches, goods on tables and a flag", 112),
    "shipyard": ("shipyard with a slipway, a half-built wooden ship hull and a crane", 160),
}



# Field buildings: flat ground with a small building at the back corner (see the farm guides in make-templates.py).
FARM_IDS = list(['cotton_plantation', 'sheep_farm', 'potato_farm', 'tobacco_plantation', 'hops_farm', 'spice_plantation', 'grain_farm', 'sugar_plantation', 'vineyard', 'silk_plantation', 'indigo_farm', 'cattle_farm'])
FARM_BUILDING_HEIGHT = 80
