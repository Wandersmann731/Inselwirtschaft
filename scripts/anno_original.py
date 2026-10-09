"""Values of the original game (docs/anno1503-gebaeudedaten.md, AnnoWiki 1503) for the buildings that also exist in our game.

key = our building id; value = (tools, wood, bricks, marble, coins, upkeep active, upkeep idle or None, radius or None)
Radius is the supply radius of a public building; for market house and Kontor the catchment.
"""

ORIGINAL = {
    "house_aristocrats": (12, 10, 20, 5, 0, None, None, None),
    "market_house": (3, 7, 0, 0, 250, 10, None, 22),
    "kontor": (5, 12, 0, 0, 350, 15, None, None),
    "tavern": (5, 9, 0, 0, 500, 20, None, 18),
    "chapel": (6, 10, 0, 0, 700, 15, None, 19),
    "church": (9, 15, 20, 0, 1600, 50, None, 21),
    "bathhouse": (20, 15, 25, 10, 1600, 90, None, 22),
    "theater": (35, 15, 30, 20, 2500, 200, None, 22),
    "forester": (2, 0, 0, 0, 150, 12, 4, None),
    "hunting_lodge": (1, 3, 0, 0, 140, 20, 8, None),
    "sheep_farm": (2, 4, 0, 0, 220, 10, 5, None),
    "cattle_farm": (5, 8, 4, 0, 300, 15, 10, None),
    "tobacco_plantation": (4, 5, 8, 0, 350, 30, 15, None),
    "spice_plantation": (4, 5, 8, 0, 390, 40, 20, None),
    "hops_farm": (5, 3, 4, 0, 250, 18, 10, None),
    "grain_farm": (2, 3, 3, 0, 200, 10, 5, None),
    "cotton_plantation": (5, 2, 4, 0, 380, 20, 10, None),
    "sugar_plantation": (4, 4, 4, 0, 310, 18, 12, None),
    "silk_plantation": (5, 5, 6, 0, 300, 35, 1, None),
    "indigo_farm": (3, 2, 5, 0, 200, 40, 20, None),
    "vineyard": (5, 5, 8, 0, 400, 45, 20, None),
    "potato_farm": (2, 4, 0, 0, 250, 20, 8, None),
    "tannery": (2, 5, 0, 0, 300, 9, 5, None),
    "weaver": (3, 4, 0, 0, 300, 15, 10, None),
    "dyer": (7, 2, 8, 0, 500, 40, 35, None),
    "brewery": (3, 4, 4, 0, 300, 20, 10, None),
    "distillery": (5, 6, 1, 0, 300, 20, 5, None),
    "tobacco_factory": (4, 2, 6, 0, 300, 16, 8, None),
    "oil_boiler": (5, 5, 5, 0, 500, 20, 10, None),
    "butcher": (4, 5, 4, 0, 350, 22, 12, None),
    "mill": (4, 3, 3, 0, 300, 16, 9, None),
    "bakery": (5, 3, 5, 0, 300, 15, 10, None),
    "toolmaker": (3, 4, 8, 0, 500, 25, 15, None),
    "goldsmith": (6, 7, 11, 0, 350, 40, 20, None),
    "salt_mine": (5, 15, 0, 0, 700, 25, 10, None),
    "saltworks": (5, 5, 0, 0, 400, 30, 12, None),
    "quarry": (3, 3, 0, 0, 300, None, None, None),
    "stonemason": (3, 3, 0, 0, 250, 18, 7, None),
    "marble_quarry": (3, 3, 0, 0, 400, None, None, None),
    "marble_mason": (5, 4, 10, 0, 300, 18, 7, None),
    "ore_mine": (5, 15, 0, 0, 1200, 40, 15, None),
    "smelter": (10, 4, 10, 0, 800, 40, 20, None),
    "gold_mine": (15, 12, 4, 0, 1500, 50, 20, None),
    "gem_mine": (8, 4, 10, 0, 1500, 80, 30, None),
    "fishery": (2, 6, 0, 0, 180, 20, 12, None),
    "whaler": (5, 5, 5, 0, 500, 20, 10, None),
    "shipyard": (15, 18, 12, 0, 1200, None, None, None),
}

# Market prices per ton at the stands (strategy guide, midpoints of the ranges)
PRICES = {"food": 48, "cloth": 78, "leather": 80, "salt": 40, "tobacco": 90, "spices": 75, "silk": 92, "lamp_oil": 90, "wine": 75, "jewelry": 207}
