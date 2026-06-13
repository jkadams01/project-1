#!/usr/bin/env python3
"""Generates Pokemon Center / Mart interior maps for every town."""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'js', 'data', 'maps')

CENTER_TILES = [
    "################",
    "#.....##.......#",
    "#..............#",
    "#..............#",
    "#..............#",
    "#..............#",
    "#..............#",
    "#######D########"
]
MART_TILES = [
    "##############",
    "#..##....##..#",
    "#............#",
    "#..##....##..#",
    "#............#",
    "#............#",
    "#............#",
    "#............#",
    "######D#######"
]

# town id -> (display, exit map, center back x/y, mart back x/y, stock)
BASIC = ["poke-ball", "potion", "antidote", "paralyze-heal", "awakening", "burn-heal", "repel"]
MID = ["poke-ball", "great-ball", "potion", "super-potion", "antidote", "paralyze-heal", "awakening", "burn-heal", "ice-heal", "full-heal", "repel", "super-repel", "escape-rope", "revive"]
HIGH = ["great-ball", "ultra-ball", "quick-ball", "dusk-ball", "timer-ball", "net-ball", "super-potion", "hyper-potion", "max-potion", "full-restore", "full-heal", "revive", "max-repel", "escape-rope"]

# cpos/mpos = the tile the player lands on in the town when LEAVING the interior.
# gen_world.py places every town's buildings at fixed spots: center door->(4,5),
# mart door->(18,5). sandgem is hand-authored (14,5)/(22,5); league_front uses
# its own building layout (3,5)/(15,5).
STD_C, STD_M = (4, 5), (18, 5)
TOWNS = {
    'sandgem':   ('Sandgem',   'sandgem',   (14, 5), (22, 5), BASIC),
    'jubilife':  ('Jubilife',  'jubilife',  STD_C, STD_M, BASIC + ["great-ball", "super-potion", "escape-rope"]),
    'oreburgh':  ('Oreburgh',  'oreburgh',  STD_C, STD_M, BASIC + ["great-ball", "super-potion", "escape-rope", "revive"]),
    'floaroma':  ('Floaroma',  'floaroma',  STD_C, STD_M, BASIC + ["great-ball", "super-potion", "net-ball"]),
    'eterna':    ('Eterna',    'eterna',    STD_C, STD_M, MID),
    'hearthome': ('Hearthome', 'hearthome', STD_C, STD_M, MID),
    'solaceon':  ('Solaceon',  'solaceon',  STD_C, STD_M, MID),
    'veilstone': ('Veilstone', 'veilstone', STD_C, STD_M, MID + ["dusk-ball", "quick-ball", "hyper-potion"]),
    'pastoria':  ('Pastoria',  'pastoria',  STD_C, STD_M, MID + ["net-ball", "hyper-potion"]),
    'celestic':  ('Celestic',  'celestic',  STD_C, STD_M, MID + ["dusk-ball", "hyper-potion"]),
    'canalave':  ('Canalave',  'canalave',  STD_C, STD_M, HIGH),
    'snowpoint': ('Snowpoint', 'snowpoint', STD_C, STD_M, HIGH),
    'sunyshore': ('Sunyshore', 'sunyshore', STD_C, STD_M, HIGH),
    'fight_area':('Fight Area','fight_area',STD_C, STD_M, HIGH + ["max-revive", "elixir"]),
    'league':    ('Pokemon League', 'league_front', (3, 5), (15, 5), HIGH + ["max-revive", "ether", "elixir"])
}

for tid, (name, back, cpos, mpos, stock) in TOWNS.items():
    center = {
        "name": name + " Pokemon Center", "theme": "center", "music": "center", "indoor": True,
        "tiles": CENTER_TILES,
        "healSpot": {"x": 7, "y": 3},
        "warps": [{"x": 7, "y": 7, "to": back, "tx": cpos[0], "ty": cpos[1], "dir": "down"}],
        "signs": [],
        "npcs": [
            {"id": "nurse", "x": 7, "y": 1, "sprite": "nurse", "dir": "down", "move": "static", "script": "nurse_heal"},
            {"id": "pc", "x": 13, "y": 1, "sprite": "scientist", "dir": "down", "move": "static", "script": "use_pc"},
            {"id": "lounger", "x": 3, "y": 4, "sprite": "lass", "dir": "down", "move": "wander", "text": "generic_hmless"}
        ]
    }
    mart = {
        "name": name + " Poke Mart", "theme": "mart", "music": "center", "indoor": True,
        "tiles": MART_TILES,
        "shop": stock,
        "warps": [{"x": 6, "y": 8, "to": back, "tx": mpos[0], "ty": mpos[1], "dir": "down"}],
        "signs": [],
        "npcs": [
            {"id": "clerk", "x": 2, "y": 6, "sprite": "clerk", "dir": "right", "move": "static", "script": "shop_here"}
        ]
    }
    for suffix, payload in (('center', center), ('mart', mart)):
        path = os.path.join(OUT, '%s_%s.js' % (tid, suffix))
        with open(path, 'w', encoding='utf-8') as f:
            f.write("PKM.registerMap('%s_%s', " % (tid, suffix))
            json.dump(payload, f, indent=1)
            f.write(');\n')
print('generated %d interior maps' % (len(TOWNS) * 2))
