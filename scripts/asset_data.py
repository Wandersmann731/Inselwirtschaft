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
    "brewery": ("brewery with a big copper brewing kettle, stacked oak barrels, a brick chimney on the roof and sacks of hops", 112),
    "saltworks": ("salt works: long shallow evaporation pans with white salt crystals, a low wooden boiling house with a chimney, salt sacks", 96),
    "butcher": ("butcher's shop with hanging meat and sausages, a wooden chopping block, a stone cellar entrance and a cattle pen at the side", 96),
    "hunting_lodge": ("hunter's lodge: small timber hut with antlers over the door, drying hides on a frame, a stack of firewood and a bow", 96),
    "marble_quarry": ("marble quarry cut into a white rocky slope with big pale marble blocks, a wooden crane and a ramp", 112),
    "marble_mason": ("marble mason's workshop with a stone saw, pale marble slabs and half carved statues, a stone building with a tile roof", 112),
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


# --- house variants ---------------------------------------------------------------------------------
HOUSE_VARIANTS = 16
RUIN_VARIANTS = 4
FIELD_VARIANTS = 4  # extra pictures for often built field buildings and workshops (variant 1 is the plain id)
WORKSHOP_IDS = ["brewery", "saltworks", "butcher", "hunting_lodge", "marble_mason", "weaver", "bakery", "mill", "stonemason", "smelter", "toolmaker", "distillery", "tannery", "tobacco_factory", "dyer", "oil_boiler", "goldsmith", "market_house"]
PLOT_IDS = ["forester", "fishery", "quarry", "ore_mine", "salt_mine", "gold_mine", "gem_mine", "marble_quarry"] + WORKSHOP_IDS  # workshops that stand on a small plot like a house
VARIANT_BUILDINGS = list(FARM_IDS) + PLOT_IDS

# Per tier: the kind of house and lists the variants pick from. Every variant mixes one entry of each list
# (stepping through the lists with different strides), so no two of the 16 look alike.
HOUSE_STYLE = {
    "house_pioneers": {
        "kind": "small simple one-room settler hut",
        "roofs": ["thatched roof", "dark shingle roof", "turf roof with grass on top", "reed roof", "weathered wooden plank roof", "rough bark roof"],
        "walls": ["rough timber log walls", "weathered grey plank walls", "clay and straw walls with timber corners", "dark brown timber walls", "pale whitewashed rough walls", "stacked log walls with moss"],
        "yards": ["a small vegetable patch", "a woodpile and a chopping stump", "a low wattle fence and a barrel", "a hay stack and a few chickens", "a small well", "a bench and a rain barrel"],
        "extras": ["a tiny stone chimney", "a small porch", "a lean-to shed on the side", "a wooden door with a tiny window", "a hanging lantern"],
    },
    "house_settlers": {
        "kind": "timber-framed cottage",
        "roofs": ["red clay tile roof", "grey wooden shingle roof", "orange tile roof", "dark slate roof", "mossy shingle roof", "brown tile roof"],
        "walls": ["whitewashed plaster walls with dark timber beams", "cream plaster walls with brown beams", "pale yellow plaster walls", "light grey plaster walls with dark beams", "stone ground floor with plaster above", "pale blue-washed plaster walls"],
        "yards": ["a small fenced flower garden", "an apple tree and a bench", "a vegetable garden with a scarecrow", "a stacked firewood wall and a cart", "a little herb garden", "a small pond with ducks"],
        "extras": ["a brick chimney", "shuttered windows with flower boxes", "a covered front porch", "a small dormer window", "a side extension"],
    },
    "house_citizens": {
        "kind": "two-storey half-timbered townhouse",
        "roofs": ["steep red clay tile roof", "dark slate roof", "orange tile roof with a dormer", "grey tile roof", "brown tile gable roof", "green-glazed tile roof"],
        "walls": ["half-timbered upper floor over a stone ground floor", "plaster walls with dark half-timbering", "brick walls with timber upper floor", "pale plaster with ochre beams", "grey stone walls with timber gable", "white plaster with brown half-timbering"],
        "yards": ["a small courtyard with a well", "a trimmed hedge and a bench", "a little herb garden behind a fence", "a cobblestone yard with barrels", "a tree and flower beds", "a small cart and crates"],
        "extras": ["a bay window", "a hanging trade sign", "a wooden balcony", "two chimneys", "a stone staircase to the door"],
    },
    "house_merchants": {
        "kind": "stately three-storey merchant house",
        "roofs": ["tall red tile gable roof", "dark slate mansard roof", "orange tile roof with several dormers", "copper-green roof", "grey tile roof with a gable end to the street", "brown tile roof with a small tower"],
        "walls": ["stone ground floor with plaster upper floors", "pale plaster with carved timber beams", "brick walls with stone corners", "cream stone walls with painted shutters", "ochre plaster with white window frames", "grey stone with dark timber"],
        "yards": ["a stone-paved forecourt with a fountain", "a walled garden with a small tree", "crates and barrels at a loading door", "a trimmed hedge garden", "a courtyard with a cart", "a gated entrance with lanterns"],
        "extras": ["a balcony with a hanging banner", "a crane beam for goods", "a carved wooden door", "an ornate gable", "a trade sign with a golden emblem"],
    },
    "house_aristocrats": {
        "kind": "elegant manor house",
        "roofs": ["slate mansard roof with ornamental dormers", "green copper roof", "grey slate roof with a small tower", "red tile roof with carved gables", "dark blue slate roof", "high hipped roof with finials"],
        "walls": ["cream-coloured stone walls with columns", "white stone walls with tall windows", "pale sandstone walls with a balcony", "warm ochre stone walls", "light grey stone with red brick trim", "white plaster with gilded details"],
        "yards": ["a formal garden with a fountain", "clipped hedges and statues", "a cobbled forecourt with lanterns", "a rose garden and a gate", "a gravel drive with trimmed trees", "a small orchard with a bench"],
        "extras": ["a pillared entrance", "a grand staircase", "a balustrade terrace", "a coat of arms above the door", "a clock tower"],
    },
}

RUIN_STYLE = [
    "burnt-out ruin of a stately house with broken walls and charred beams, no roof, a little weeds",
    "collapsed stone house ruin, one wall standing, roof beams fallen inside, overgrown with weeds",
    "ruin of a burnt timber house with blackened posts and rubble",
    "crumbled manor ruin with broken columns and ivy on the remaining wall",
]


def house_variant(tier_id, index):
    """English description of variant number `index` (1-based) of a house tier."""
    style = HOUSE_STYLE[tier_id]
    i = index - 1
    pick = lambda items, stride, offset: items[(i * stride + offset + i // len(items)) % len(items)]  # noqa: E731
    return (
        f"{style['kind']} with a {pick(style['roofs'], 1, 0)}, {pick(style['walls'], 5, 1)}, and {pick(style['extras'], 3, 2)}; "
        f"on its small plot there is {pick(style['yards'], 7, 3)}"
    )
