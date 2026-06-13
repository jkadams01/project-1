#!/usr/bin/env python3
"""Generates js/data/encounters.js so that EVERY species (gens 1-9, plus
included regional/alt forms) is obtainable:
 - non-legendary base-stage species distributed across wild tables by BST/biome
 - species reachable by evolution excluded from the must-place pool
 - legendaries/mythicals placed as static encounters in the Hall of Legends
   (post-game) plus a few story statics handled by scripts
Also writes the hall_of_legends map with one pedestal trigger per legendary."""
import json, os, re
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..')

def load_payload(path):
    s = open(path, encoding='utf-8').read()
    return json.loads(s[s.index(', ') + 2:s.rindex(');')])

species = load_payload(os.path.join(ROOT, 'js/data/species.js'))['list']
evo = load_payload(os.path.join(ROOT, 'js/data/evolutions.js'))['edges']
by_id = {e['id']: e for e in species}

evo_targets = set()
for base, edges in evo.items():
    for e in edges:
        evo_targets.add(e['to'])

# ----------------------------------------------------------------- area list
# (id, avg_level(min,max), biomes, capacity_bonus, has_water, has_fishing, stage)
AREAS = [
    ('route201', 2, 4, ['field', 'normal', 'flying'], 0),
    ('route202', 2, 4, ['field', 'electric', 'normal'], 0),
    ('verity', 3, 5, ['water-edge', 'psychic', 'fairy'], 1),
    ('route203', 4, 7, ['field', 'fighting', 'normal'], 0),
    ('oreburgh_gate', 5, 8, ['cave', 'rock'], 0),
    ('oreburgh_mine', 6, 9, ['cave', 'rock', 'ground'], 0),
    ('route204', 5, 8, ['field', 'grass', 'bug'], 0),
    ('ravaged_path', 6, 9, ['cave', 'rock'], 0),
    ('route218', 8, 12, ['water-edge', 'water', 'flying'], 1),
    ('route205south', 9, 12, ['field', 'water-edge', 'electric'], 1),
    ('valley_windworks', 9, 12, ['electric', 'steel'], 1),
    ('eterna_forest', 10, 13, ['forest', 'bug', 'grass', 'ghost'], 0),
    ('route205north', 10, 13, ['forest', 'grass'], 0),
    ('route211', 11, 14, ['mountain', 'flying', 'rock'], 0),
    ('route206', 14, 17, ['mountain', 'ground', 'rock'], 0),
    ('wayward_cave', 15, 18, ['cave', 'dragon', 'dark'], 0),
    ('route207', 14, 17, ['mountain', 'fighting'], 0),
    ('mt_coronet_south', 15, 18, ['cave', 'rock', 'steel'], 0),
    ('route208', 16, 19, ['field', 'grass', 'rock'], 1),
    ('route209', 16, 19, ['field', 'normal', 'fairy', 'ghost'], 1),
    ('lost_tower', 17, 20, ['ghost', 'dark'], 0),
    ('solaceon_ruins', 17, 21, ['psychic', 'ghost'], 0),
    ('route210south', 18, 21, ['field', 'normal', 'psychic'], 0),
    ('route215', 19, 22, ['field', 'fighting', 'dark'], 0),
    ('route214', 20, 23, ['field', 'poison', 'dark'], 0),
    ('valor_lakefront', 22, 25, ['water-edge', 'fairy'], 1),
    ('route213', 21, 24, ['beach', 'water', 'normal'], 1),
    ('great_marsh', 22, 26, ['marsh', 'poison', 'water', 'bug', 'grass'], 1),
    ('route212south', 20, 23, ['field', 'grass', 'fairy'], 0),
    ('route212north', 22, 25, ['marsh', 'water', 'poison'], 1),
    ('route210north', 24, 27, ['mountain', 'dragon', 'flying'], 0),
    ('celestic_pond', 24, 27, ['water-edge', 'psychic'], 1),
    ('mt_coronet_main', 24, 28, ['cave', 'rock', 'steel', 'dragon'], 0),
    ('iron_island', 28, 33, ['cave', 'steel', 'fighting', 'rock'], 0),
    ('route216', 28, 32, ['snow', 'ice'], 0),
    ('route217', 30, 34, ['snow', 'ice', 'ghost'], 0),
    ('acuity_lakefront', 32, 35, ['snow', 'ice', 'psychic'], 1),
    ('mt_coronet_upper', 30, 34, ['cave', 'rock', 'dragon', 'steel'], 0),
    ('mt_coronet_summit', 33, 37, ['snow', 'dragon', 'psychic'], 0),
    ('route222', 36, 40, ['beach', 'electric', 'water', 'normal'], 1),
    ('route223', 40, 45, ['water', 'flying'], 1),
    ('victory_road', 42, 48, ['cave', 'dragon', 'rock', 'fighting', 'steel'], 0),
    ('distortion_world', 45, 50, ['ghost', 'dark', 'psychic', 'dragon'], 0),
    ('fight_area', 48, 54, ['field', 'fighting', 'normal'], 1),
    ('route225', 50, 56, ['mountain', 'fire', 'rock', 'flying'], 0),
    ('stark_mountain', 54, 60, ['cave', 'fire', 'ground', 'rock'], 0),
    ('sendoff_spring', 52, 58, ['ghost', 'dragon', 'water-edge', 'psychic'], 1),
    ('snowpoint_temple', 50, 58, ['snow', 'ice', 'steel', 'ghost'], 0),
]

# city water tables (small, water/fishing only)
WATER_ONLY = ['sandgem_water', 'canalave_water', 'pastoria_water', 'sunyshore_water', 'twinleaf_pond']

# Platinum signature pins: table -> [(pokeId, weight), ...]
PINS = {
    'route201': [(396, 30), (399, 30), (403, 16)],
    'route202': [(403, 30), (396, 20), (399, 20)],
    'route203': [(63, 8), (66, 12), (396, 16)],
    'oreburgh_gate': [(41, 25), (74, 25)],
    'oreburgh_mine': [(74, 25), (95, 12)],
    'route204': [(406, 14), (265, 14), (10, 10), (13, 10)],
    'ravaged_path': [(41, 25)],
    'eterna_forest': [(406, 10), (412, 12), (415, 10), (92, 12), (425, 10)],
    'route205south': [(417, 14), (418, 12)],
    'route205north': [(397, 12), (420, 10)],
    'route206': [(74, 14), (95, 10), (443, 8)],
    'wayward_cave': [(443, 14), (41, 16)],
    'route207': [(66, 12), (74, 12)],
    'mt_coronet_south': [(436, 12), (74, 14), (41, 14)],
    'route208': [(415, 10), (406, 10), (39, 8)],
    'route209': [(417, 10), (39, 10), (200, 8), (433, 8)],
    'lost_tower': [(92, 25), (200, 18), (425, 10)],
    'solaceon_ruins': [(201, 60)],
    'route210south': [(77, 12), (419, 10), (63, 8)],
    'route215': [(63, 10), (66, 12), (434, 10)],
    'route214': [(434, 12), (23, 10), (42, 8)],
    'route213': [(422, 14), (423, 8)],
    'great_marsh': [(46, 8), (102, 8), (114, 8), (195, 10), (339, 10), (451, 10), (453, 12), (455, 8)],
    'route212north': [(453, 12), (339, 10), (60, 10)],
    'route210north': [(443, 8), (147, 6), (148, 3)],
    'mt_coronet_main': [(436, 10), (437, 6), (35, 8), (358, 6)],
    'iron_island': [(436, 10), (448, 0), (305, 12), (95, 10)],
    'route216': [(459, 16), (215, 12), (361, 12)],
    'route217': [(459, 16), (215, 12), (220, 14), (361, 10)],
    'acuity_lakefront': [(215, 12), (361, 12), (459, 10)],
    'mt_coronet_summit': [(358, 8), (334, 6), (443, 8)],
    'victory_road': [(444, 10), (67, 10), (304, 10), (42, 10)],
    'distortion_world': [(92, 12), (93, 10), (200, 10), (356, 8), (477, 6)],
    'stark_mountain': [(322, 12), (323, 8), (218, 12), (219, 8), (111, 10), (112, 6)],
    'snowpoint_temple': [(220, 10), (215, 10), (361, 10), (478, 6)],
}

FISH_COMMON = [(129, 40), (118, 20), (339, 15)]  # magikarp/goldeen/barboach everywhere

# ------------------------------------------------------------ build the pool
must_place = []   # entries that can ONLY come from the wild
fillers = []      # evolution-reachable species usable as flavor
legends = []
for e in species:
    if e['legend']:
        legends.append(e)
        continue
    if e['id'] in evo_targets:
        fillers.append(e)
    else:
        must_place.append(e)

def bst(e): return sum(e['stats'])

must_place.sort(key=bst)
n_areas = len(AREAS)

# biome match score
WATERY = ('water',)
def biome_score(e, biomes):
    ts = e['types']
    score = 0
    for b in biomes:
        if b in ts: score += 3
        if b == 'field' and ('normal' in ts or 'flying' in ts): score += 1
        if b == 'forest' and ('bug' in ts or 'grass' in ts): score += 2
        if b == 'cave' and ('rock' in ts or 'ground' in ts or 'dark' in ts): score += 2
        if b == 'snow' and 'ice' in ts: score += 3
        if b == 'beach' and 'water' in ts: score += 2
        if b == 'marsh' and ('poison' in ts or 'water' in ts or 'bug' in ts): score += 1
        if b == 'mountain' and ('rock' in ts or 'flying' in ts or 'fighting' in ts): score += 1
        if b == 'water-edge' and 'water' in ts: score += 2
    return score

# percentile band per area (overlapping bands smooth distribution)
tables = {a[0]: {'grass': [], 'water': [], 'fishing': []} for a in AREAS}
for t in WATER_ONLY:
    tables[t] = {'water': [], 'fishing': []}

water_pool = [e for e in must_place if 'water' in e['types']]
land_pool = [e for e in must_place if 'water' not in e['types']]

def assign(pool, slot):
    pool = sorted(pool, key=bst)
    per = max(1, len(pool) // n_areas)
    for i, e in enumerate(pool):
        band = min(n_areas - 1, i // per)
        # pick best-biome area within +-3 of band
        cands = []
        for off in (0, -1, 1, -2, 2, -3, 3):
            j = band + off
            if 0 <= j < n_areas:
                a = AREAS[j]
                cands.append((biome_score(e, a[3]) - abs(off) * 0.4, j))
        cands.sort(reverse=True)
        a = AREAS[cands[0][1]]
        tables[a[0]][slot].append([e['id'], a[1], a[2], 8])

assign(land_pool, 'grass')

# water dwellers: distribute across areas with water + the city tables
water_areas = [a for a in AREAS if any(b in ('water-edge', 'water', 'beach', 'marsh') for b in a[3])]
wsorted = sorted(water_pool, key=bst)
wtargets = [a[0] for a in water_areas] + WATER_ONLY
for i, e in enumerate(wsorted):
    frac = i / max(1, len(wsorted) - 1)
    # early water mons also go to city ponds; later to late routes
    ti = int(frac * (len(wtargets) - 1))
    tid = wtargets[ti]
    lv = (5 + int(frac * 40), 10 + int(frac * 45))
    slot = 'fishing' if i % 2 else 'water'
    tables[tid][slot].append([e['id'], lv[0], lv[1], 8])

# pins (signature mons get heavy weights at the front)
for tid, pins in PINS.items():
    if tid not in tables: continue
    a = next((x for x in AREAS if x[0] == tid), None)
    lo, hi = (a[1], a[2]) if a else (5, 10)
    for pid, w in pins:
        if w <= 0: continue
        if pid not in by_id: continue
        tables[tid]['grass'].insert(0, [pid, lo, hi, w])

# fishing commons everywhere there is water
for tid, t in tables.items():
    if 'fishing' in t:
        a = next((x for x in AREAS if x[0] == tid), None)
        lo = a[1] if a else 5
        for pid, w in FISH_COMMON:
            t['fishing'].append([pid, max(3, lo - 2), lo + 8, w])

# flavor fillers: sprinkle a few evolution-stage mons into late areas
late = [a for a in AREAS if a[1] >= 24]
fl = sorted([e for e in fillers if not e['legend']], key=bst)
step = max(1, len(fl) // (len(late) * 4))
for i, e in enumerate(fl[::step]):
    a = late[i % len(late)]
    if bst(e) < 380 or bst(e) > 540: continue
    tables[a[0]]['grass'].append([e['id'], a[1], a[2], 3])

# trim oversized tables (keep coverage: only trim entries whose species appears elsewhere)
seen_count = defaultdict(int)
for t in tables.values():
    for slot in t.values():
        for row in slot:
            seen_count[row[0]] += 1
for t in tables.values():
    for k in t:
        if len(t[k]) > 30:
            keep, drop = [], []
            for row in t[k]:
                (keep if seen_count[row[0]] <= 1 or len(keep) < 30 else drop).append(row)
            t[k] = keep[:34]

# --------------------------------------------------------------- legendaries
legends.sort(key=lambda e: (e['gen'], e['id']))
hall = [[e['id'], 70 if bst(e) >= 660 else 60] for e in legends]

payload = dict(tables)
payload['hall_static'] = hall

out = os.path.join(ROOT, 'js/data/encounters.js')
with open(out, 'w', encoding='utf-8') as f:
    f.write("PKM.registerData('encounters', ")
    json.dump(payload, f, separators=(',', ':'))
    f.write(');\n')
print('encounters written:', len(tables), 'tables,', len(hall), 'hall legends')

# ------------------------------------------------- hall of legends map (generated)
cols = 8
rows_needed = (len(hall) + cols - 1) // cols
wid = cols * 3 + 3
hei = rows_needed * 3 + 6
grid = [['.'] * wid for _ in range(hei)]
for x in range(wid):
    grid[0][x] = '#'; grid[hei - 1][x] = '#'
for y in range(hei):
    grid[y][0] = '#'; grid[y][wid - 1] = '#'
triggers = []
for i in range(len(hall)):
    r, c = divmod(i, cols)
    x, y = 2 + c * 3, 2 + r * 3
    grid[y][x] = 'o'
    triggers.append({'x': x, 'y': y + 1, 'w': 1, 'h': 1, 'script': 'hall_pedestal_' + str(i)})
# entrance at bottom center
ex = wid // 2
grid[hei - 1][ex] = 'D'
mapdef = {
    'name': 'Hall of Legends', 'theme': 'league', 'music': 'distortion', 'indoor': True,
    'tiles': [''.join(r) for r in grid],
    'warps': [{'x': ex, 'y': hei - 1, 'to': 'sendoff_spring', 'tx': 12, 'ty': 6, 'dir': 'down'}],
    'signs': [], 'npcs': [], 'triggers': triggers
}
with open(os.path.join(ROOT, 'js/data/maps/hall_of_legends.js'), 'w', encoding='utf-8') as f:
    f.write("PKM.registerMap('hall_of_legends', ")
    json.dump(mapdef, f, separators=(',', ':'))
    f.write(');\n')
print('hall_of_legends map written: %d pedestals (%dx%d)' % (len(hall), wid, hei))
