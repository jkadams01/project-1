#!/usr/bin/env python3
"""World/data integrity validator. Parses the PKM.registerX(...) payloads out of
the JS data files and checks:
  * every warp/connection target map exists
  * warp destinations land on in-bounds tiles
  * every trainer's mons reference real species + moves
  * encounter rows reference real species
  * SPECIES COVERAGE: all 1025 dex species are obtainable (wild, evolution from a
    wild mon, a starter pick, a story gift, or a static legendary)
Exits non-zero if any hard error is found. Warnings don't fail the build.
"""
import json, os, re, sys, glob

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
errors, warnings = [], []
def err(m): errors.append(m)
def warn(m): warnings.append(m)

def payload(path, prefix):
    """Extract the JSON literal from `PKM.registerX('key', <JSON>);`."""
    s = open(path, encoding='utf-8').read()
    i = s.index(prefix)
    j = s.index(',', i) + 1
    k = s.rindex(');')
    return s[j:k].strip()

# ------------------------------------------------------------------ load data
species = json.loads(payload(os.path.join(ROOT, 'js/data/species.js'), 'registerData'))['list']
moves = json.loads(payload(os.path.join(ROOT, 'js/data/moves.js'), 'registerData'))['list']
evo = json.loads(payload(os.path.join(ROOT, 'js/data/evolutions.js'), 'registerData'))
enc = json.loads(payload(os.path.join(ROOT, 'js/data/encounters.js'), 'registerData'))
trainers = json.loads(payload(os.path.join(ROOT, 'js/data/trainers.js'), 'registerData'))

by_id = {e['id']: e for e in species}
move_ids = {m['id'] for m in moves}
default_species = [e for e in species if e['id'] == e['species']]  # one per dex no.
DEX_MAX = 1025

# ---------------------------------------------------------------- load maps
maps = {}
for f in glob.glob(os.path.join(ROOT, 'js/data/maps/*.js')):
    try:
        d = json.loads(payload(f, 'registerMap'))
    except Exception as e:
        err('map %s: cannot parse payload (%s)' % (os.path.basename(f), e))
        continue
    mid = re.search(r"registerMap\('([^']+)'", open(f, encoding='utf-8').read()).group(1)
    maps[mid] = d

def dims(m):
    t = m['tiles']
    return len(t[0]), len(t)

# ------------------------------------------------------- map referential checks
for mid, m in maps.items():
    w, h = dims(m)
    if any(len(row) != w for row in m['tiles']):
        err('map %s: ragged tile rows (expected width %d)' % (mid, w))
    for wp in m.get('warps', []):
        if wp['to'] not in maps:
            err('map %s: warp at (%d,%d) -> missing map "%s"' % (mid, wp['x'], wp['y'], wp['to']))
        else:
            tw, th = dims(maps[wp['to']])
            if not (0 <= wp['tx'] < tw and 0 <= wp['ty'] < th):
                err('map %s: warp -> %s lands out of bounds (%d,%d)' % (mid, wp['to'], wp['tx'], wp['ty']))
        if not (0 <= wp['x'] < w and 0 <= wp['y'] < h):
            err('map %s: warp tile (%d,%d) out of bounds' % (mid, wp['x'], wp['y']))
    for d, conn in (m.get('connections') or {}).items():
        if conn['to'] not in maps:
            err('map %s: %s connection -> missing map "%s"' % (mid, d, conn['to']))
    for tr in m.get('triggers', []):
        sc = tr.get('script')
        # scripts are validated at runtime; just note missing script id key
        if 'script' not in tr:
            warn('map %s: trigger without script' % mid)

# ------------------------------------------------------------- trainer checks
for tid, t in trainers.items():
    if not t.get('mons'):
        err('trainer %s: no mons' % tid)
        continue
    for mon in t['mons']:
        if mon['id'] not in by_id:
            err('trainer %s: unknown species id %s' % (tid, mon['id']))
        for mv in mon.get('moves', []) or []:
            if mv not in move_ids:
                err('trainer %s: unknown move id %s' % (tid, mv))

# ----------------------------------------------------------- encounter checks
wild_ids = set()
for area, tbl in enc.items():
    if area == 'hall_static':
        for row in tbl:
            if row[0] not in by_id:
                err('hall_static: unknown species %s' % row[0])
            wild_ids.add(row[0])
        continue
    for slot, rows in tbl.items():
        for row in rows:
            pid = row[0]
            if pid not in by_id:
                err('encounters[%s][%s]: unknown species %s' % (area, slot, pid))
                continue
            if len(row) >= 3 and row[1] > row[2]:
                warn('encounters[%s][%s]: min>max level for %s' % (area, slot, pid))
            wild_ids.add(pid)

# ------------------------------------------------------- map reachability (BFS)
START = 'twinleaf_home_2f'
reachable_maps = set()
if START in maps:
    frontier = [START]
    reachable_maps.add(START)
    while frontier:
        cur = maps[frontier.pop()]
        nbrs = [w['to'] for w in cur.get('warps', [])]
        nbrs += [c['to'] for c in (cur.get('connections') or {}).values()]
        for nb in nbrs:
            if nb in maps and nb not in reachable_maps:
                reachable_maps.add(nb); frontier.append(nb)
else:
    warn('start map %s not found; skipping reachability' % START)
unreachable = sorted(set(maps) - reachable_maps) if reachable_maps else []

# which encounter-area ids are referenced by a reachable map's `encounters` field
reachable_areas = set()
for mid in reachable_maps:
    a = maps[mid].get('encounters')
    if a:
        reachable_areas.add(a)
if 'hall_of_legends' in reachable_maps:
    reachable_areas.add('hall_static')
enc_area_ids = {a for a in enc if a != 'hall_static'}
unreachable_enc = sorted(a for a in enc_area_ids if a not in reachable_areas)

# ------------------------------------------------------- species coverage check
# obtainable seeds: wild (only from REACHABLE areas), starters, story gifts
STARTERS = [1,4,7,152,155,158,252,255,258,387,390,393,495,498,501,650,653,656,722,725,728,810,813,816,906,909,912]
GIFTS = []  # add story-gift species ids here if any are introduced
reachable_wild = set()
for area, tbl in enc.items():
    if area == 'hall_static':
        if 'hall_static' in reachable_areas or not reachable_maps:
            reachable_wild.update(r[0] for r in tbl)
        continue
    if area in reachable_areas or not reachable_maps:
        for rows in tbl.values():
            reachable_wild.update(r[0] for r in rows)
obtainable = set(reachable_wild) | set(STARTERS) | set(GIFTS)

# propagate through evolution edges (base obtainable -> evolved obtainable)
edges = evo['edges']
changed = True
while changed:
    changed = False
    for base, elist in edges.items():
        if int(base) in obtainable:
            for e in elist:
                if e['to'] not in obtainable:
                    obtainable.add(e['to']); changed = True

# every default-form dex species must be obtainable
missing = []
for e in default_species:
    if e['species'] > DEX_MAX:
        continue
    if e['id'] not in obtainable:
        missing.append((e['species'], e['name']))
missing.sort()

# forms (id>=10000) are bonus content; report separately as warnings
form_missing = [e['name'] for e in species if e['id'] >= 10000 and e['id'] not in obtainable]

# --------------------------------------------------------------------- report
print('=== Pokemon Platinum Remake - data validation ===')
print('maps: %d | species: %d (default %d) | moves: %d | trainers: %d | encounter areas: %d'
      % (len(maps), len(species), len(default_species), len(moves), len(trainers), len(enc) - ('hall_static' in enc)))
print('maps reachable from %s: %d / %d' % (START, len(reachable_maps), len(maps)))
if unreachable:
    print('  unreachable maps (%d): %s%s' % (len(unreachable), ', '.join(unreachable[:20]), ' ...' if len(unreachable) > 20 else ''))
if unreachable_enc:
    print('  encounter areas with no reachable map (%d): %s%s' % (len(unreachable_enc), ', '.join(unreachable_enc[:20]), ' ...' if len(unreachable_enc) > 20 else ''))
print('dex coverage: %d / %d obtainable (from reachable areas)' % (DEX_MAX - len(missing), DEX_MAX))
if missing:
    print('\nMISSING dex species (%d):' % len(missing))
    for sp, nm in missing[:60]:
        print('  #%04d %s' % (sp, nm))
    if len(missing) > 60:
        print('  ...and %d more' % (len(missing) - 60))
if form_missing:
    print('\nforms not obtainable (%d, informational): %s%s'
          % (len(form_missing), ', '.join(form_missing[:12]), ' ...' if len(form_missing) > 12 else ''))

if warnings:
    print('\nWARNINGS (%d):' % len(warnings))
    for w in warnings[:40]:
        print('  - ' + w)
if errors:
    print('\nERRORS (%d):' % len(errors))
    for e in errors[:80]:
        print('  ! ' + e)

# coverage gap in mandatory dex is a hard failure
if missing:
    errors.append('%d dex species unobtainable' % len(missing))

print('\n' + ('FAILED: %d error(s)' % len(errors) if errors else 'PASSED'))
sys.exit(1 if errors else 0)
