#!/usr/bin/env python3
"""Writes the original costs and upkeep (scripts/anno_original.py) into src/data/buildings.json and the market prices into goods.json.
Keeps the formatting of the files. Run from the project root:  python3 scripts/apply-anno.py
"""
import json
import re
from pathlib import Path

from anno_original import ORIGINAL, PRICES

ROOT = Path(__file__).resolve().parent.parent
path = ROOT / "src/data/buildings.json"
text = path.read_text()
for bid, (tools, wood, bricks, marble, coins, active, idle, radius) in ORIGINAL.items():
    start = text.index(f'"id": "{bid}"')
    end = text.index("\n  }", start)
    block = text[start:end]
    block = re.sub(r'"cost": \{[^}]*\}', f'"cost": {{ "tools": {tools}, "wood": {wood}, "bricks": {bricks}, "marble": {marble}, "coins": {coins} }}', block)
    if active is not None:
        m = re.search(r'"upkeep": \{ "active": (\d+), "idle": (\d+) \}', block)
        new_idle = idle if idle is not None else int(m.group(2))
        block = re.sub(r'"upkeep": \{[^}]*\}', f'"upkeep": {{ "active": {active}, "idle": {new_idle} }}', block)
    if radius is not None:
        key = "catchment" if bid in ("market_house", "kontor") else "radius"
        block = re.sub(rf'"{key}": \d+', f'"{key}": {radius}', block)
    text = text[:start] + block + text[end:]
path.write_text(text)

goods_path = ROOT / "src/data/goods.json"
goods_text = goods_path.read_text()
for good, price in PRICES.items():
    goods_text = re.sub(rf'("id": "{good}"[^}}]*?"price": )\d+', rf"\g<1>{price}", goods_text)
goods_path.write_text(goods_text)
print("done")
