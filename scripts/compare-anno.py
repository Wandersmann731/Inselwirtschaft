#!/usr/bin/env python3
"""Compares our building data with the original values in scripts/anno_original.py and prints a Markdown table.

Run from the project root:  python3 scripts/compare-anno.py
"""
import json
from pathlib import Path

from anno_original import ORIGINAL

ROOT = Path(__file__).resolve().parent.parent
buildings = {b["id"]: b for b in json.loads((ROOT / "src/data/buildings.json").read_text())}

print("| Gebäude | Werkzeug | Holz | Ziegel | Marmor | Münzen | Unterhalt a/s | Radius |")
print("|---|---|---|---|---|---|---|---|")
same = 0
total = 0
for bid, orig in ORIGINAL.items():
    b = buildings[bid]
    c = b["cost"]
    ours = (c["tools"], c["wood"], c["bricks"], c["marble"], c["coins"], b["upkeep"]["active"], b["upkeep"]["idle"], b.get("radius", b.get("catchment")))
    cells = []
    for i, (o, u) in enumerate(zip(orig, ours)):
        if o is None:
            cells.append(f"{u if u is not None else '–'}")
            continue
        total += 1
        if o == u:
            same += 1
            cells.append(f"{u}")
        else:
            cells.append(f"**{u}** (Orig. {o})")
    upkeep = f"{cells[5]} / {cells[6]}"
    print(f"| {b['name']} | {cells[0]} | {cells[1]} | {cells[2]} | {cells[3]} | {cells[4]} | {upkeep} | {cells[7]} |")
print()
print(f"{same} von {total} Werten gleich.")
