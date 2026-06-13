/* Overworld scene: tilemaps, movement, NPCs, warps, encounters, field moves. */
PKM.Overworld = (function () {
  var T = 32, VW = 960, VH = 640;
  var U = PKM.U;

  var ow = {
    mapId: null, map: null, w: 0, h: 0,
    player: { x: 0, y: 0, dir: 'down', moving: false, mx: 0, my: 0, t: 0, surfing: false, bike: false, climbing: false, jumping: false, step: 0 },
    npcs: [], cleared: {}, locked: 0, time: 0,
    fade: 0, fadeDir: 0, pendingWarp: null, sightCooldown: 0
  };

  function tileAt(x, y) {
    if (!ow.map) return ' ';
    if (x < 0 || y < 0 || x >= ow.w || y >= ow.h) return null; // out of bounds
    if (ow.cleared[x + ',' + y]) return '.';
    return ow.map.tiles[y][x] || ' ';
  }

  /* an NPC only exists for the world (collision + interaction) when it is
     actually visible - mirrors the draw filter, so a hidden cutscene NPC like
     pre-event Barry doesn't leave an invisible wall in front of his door. */
  function npcActive(n) {
    if (n.gone) return false;
    if (n.requires && !PKM.State.flag(n.requires)) return false;
    if (n.hidden && PKM.State.flag(n.hidden)) return false;
    return true;
  }
  function npcAt(x, y) {
    for (var i = 0; i < ow.npcs.length; i++) {
      var n = ow.npcs[i];
      if (npcActive(n) && Math.round(n.x) === x && Math.round(n.y) === y) return n;
    }
    return null;
  }
  function itemAt(x, y) {
    var items = ow.map.items || [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.x === x && it.y === y && !PKM.State.flag(itemFlag(it))) return it;
    }
    return null;
  }
  function itemFlag(it) { return 'item_' + ow.mapId + '_' + it.x + '_' + it.y; }

  function warpAt(x, y) {
    var warps = ow.map.warps || [];
    for (var i = 0; i < warps.length; i++)
      if (warps[i].x === x && warps[i].y === y) return warps[i];
    return null;
  }

  var WALKABLE = { '.': 1, ',': 1, '=': 1, '*': 1, 'D': 1, '-': 1, 's': 1, 'i': 1 };

  function canEnter(x, y, dir, asNpc) {
    var ch = tileAt(x, y);
    if (ch === null) return false;
    if (npcAt(x, y)) return false;
    if (playerAt(x, y)) return false;
    if (itemAt(x, y)) return false;   // ground items are solid; collect by facing + pressing A
    if (WALKABLE[ch]) return true;
    if (asNpc) return false;
    if (ch === '~') return ow.player.surfing || PKM.State.canUseField('surf');
    if (ch === 'W') return ow.player.surfing && PKM.State.canUseField('waterfall') && (dir === 'up' || dir === 'down');
    if (ch === 'C') return PKM.State.canUseField('climb') && (dir === 'up' || dir === 'down');
    if (ch === '^') return dir === 'down'; // handled as jump
    return false;
  }
  function playerAt(x, y) { return Math.round(ow.player.x) === x && Math.round(ow.player.y) === y; }

  /* ------------------------------ map loading ----------------------------- */
  function loadMap(mapId, x, y, dir, opts) {
    opts = opts || {};
    var def = PKM.MAPS[mapId];
    if (!def) { console.error('missing map', mapId); return; }
    ow.mapId = mapId; ow.map = def;
    ow.w = def.tiles[0].length; ow.h = def.tiles.length;
    ow.cleared = {};
    ow.player.x = x; ow.player.y = y; ow.player.dir = dir || 'down';
    ow.player.moving = false; ow.player.t = 0;
    ow.player.surfing = tileAt(x, y) === '~';
    ow.player.climbing = tileAt(x, y) === 'C';
    ow.npcs = (def.npcs || []).map(function (n) { return Object.assign({ ox: n.x, oy: n.y, wt: U.ri(1, 3) }, n); });
    if (def.town) PKM.G.visited[def.town] = true;
    PKM.G.map = mapId; PKM.G.x = x; PKM.G.y = y;
    if (def.music) PKM.Audio.play(def.music);
    if (def.onEnter && !opts.noEnter) PKM.Events.run(def.onEnter);
  }

  function warpTo(mapId, x, y, dir) {
    ow.fadeDir = 1;
    ow.pendingWarp = { mapId: mapId, x: x, y: y, dir: dir };
    PKM.Audio.sfx('door');
  }

  /* ------------------------------- movement ------------------------------- */
  function tryMove(dir) {
    var p = ow.player;
    p.dir = dir;
    var d = U.DIRS[dir], nx = Math.round(p.x) + d[0], ny = Math.round(p.y) + d[1];

    // edge connections
    if (nx < 0 || ny < 0 || nx >= ow.w || ny >= ow.h) {
      var conn = (ow.map.connections || {})[dir === 'up' ? 'up' : dir === 'down' ? 'down' : dir];
      if (conn) {
        var tgt = PKM.MAPS[conn.to];
        if (!tgt) return;
        var tw = tgt.tiles[0].length, th = tgt.tiles.length;
        var tx, ty, off = conn.offset || 0;
        if (dir === 'left') { tx = tw - 1; ty = ny + off; }
        if (dir === 'right') { tx = 0; ty = ny + off; }
        if (dir === 'up') { ty = th - 1; tx = nx + off; }
        if (dir === 'down') { ty = 0; tx = nx + off; }
        tx = U.clamp(tx, 0, tw - 1); ty = U.clamp(ty, 0, th - 1);
        loadMap(conn.to, tx, ty, dir);
      }
      return;
    }

    var ch = tileAt(nx, ny);
    // ledge jump
    if (ch === '^' && dir === 'down') {
      p.jumping = true; p.moving = true; p.t = 0; p.mx = 0; p.my = 2;
      PKM.Audio.sfx('jump');
      return;
    }
    if (!canEnter(nx, ny, dir)) {
      // auto-surf prompt
      if (ch === '~' && !p.surfing && !PKM.State.canUseField('surf')) hintField('surf');
      else if (ch === 'C' && !PKM.State.canUseField('climb')) hintField('climb');
      else if (ch === 'W' && p.surfing && !PKM.State.canUseField('waterfall')) hintField('waterfall');
      if (!p.bumpT || p.bumpT <= 0) { PKM.Audio.sfx('bump'); p.bumpT = .35; }
      return;
    }
    if (ch === '~' && !p.surfing) {
      askSurf(nx, ny, dir);
      return;
    }
    startStep(d[0], d[1]);
  }

  function startStep(dx, dy) {
    var p = ow.player;
    p.moving = true; p.t = 0; p.mx = dx; p.my = dy; p.step = 1 - p.step;
  }

  var hintShown = {};
  function hintField(what) {
    if (ow.locked || hintShown[what + ow.mapId]) return;
    hintShown[what + ow.mapId] = true;
    var h = PKM.State.fieldHint(what);
    var msg = h[1] ? 'You need the ' + h[0] + ' and the ' + h[1] + ' to pass this way.'
                   : 'You need the ' + h[0] + ' to pass this way.';
    if (PKM.State.hasItem({ cut: 'hatchet', rocksmash: 'miners-hammer', strength: 'power-gauntlets', surf: 'wavewalker-charm', waterfall: 'cascade-charm', climb: 'climbing-gear' }[what]) )
      msg = 'The ' + h[0] + ' won\'t respond yet. Earn the ' + h[1] + ' first!';
    PKM.Dialog.say(msg);
  }

  function askSurf(nx, ny, dir) {
    if (ow.locked) return;
    PKM.Dialog.ask('The water is a deep blue... Ride the waves with your Wavewalker Charm?', ['Surf', 'Cancel'], function (i) {
      if (i === 0) {
        ow.player.surfing = true;
        PKM.Audio.play('surf');
        startStep(U.DIRS[dir][0], U.DIRS[dir][1]);
      }
    });
  }

  function arrive() {
    var p = ow.player;
    p.x = Math.round(p.x + p.mx); p.y = Math.round(p.y + p.my);
    p.moving = false; p.jumping = false;
    var ch = tileAt(p.x, p.y);

    // dismount / mount transitions
    if (p.surfing && ch !== '~' && ch !== 'W' && ch !== 's') { p.surfing = false; if (ow.map.music) PKM.Audio.play(ow.map.music); }
    p.climbing = ch === 'C';

    // warp tiles
    var w = warpAt(p.x, p.y);
    if (w) { warpTo(w.to, w.tx, w.ty, w.dir || p.dir); return; }

    // ice slide
    if (ch === 'i') {
      var d = U.DIRS[p.dir], nx = p.x + d[0], ny = p.y + d[1];
      if (canEnter(nx, ny, p.dir)) { startStep(d[0], d[1]); return; }
    }

    // triggers
    var trigs = ow.map.triggers || [];
    for (var i = 0; i < trigs.length; i++) {
      var t = trigs[i];
      if (p.x >= t.x && p.x < t.x + (t.w || 1) && p.y >= t.y && p.y < t.y + (t.h || 1)) {
        if (t.once && PKM.State.flag(t.once)) continue;
        if (t.requires && !PKM.State.flag(t.requires)) continue;
        if (t.unless && PKM.State.flag(t.unless)) continue;
        if (t.once) PKM.State.setFlag(t.once);
        PKM.Events.run(t.script);
        return;
      }
    }

    // repel
    if (PKM.G.repel > 0) {
      PKM.G.repel--;
      if (PKM.G.repel === 0) PKM.Dialog.say('The Repel wore off!');
    }

    // wild encounters
    var enc = ch === ',' || (ow.map.caveEncounters && (ch === '.' )) || (p.surfing && ch === '~');
    if (enc && ow.map.encounters) {
      var rate = p.surfing ? 9 : (ch === ',' ? 11 : 7);
      if (U.chance(rate)) spawnWild(p.surfing ? 'water' : 'grass');
    }
  }

  function spawnWild(slot, rodOverride) {
    var table = (PKM.DATA.encounters || {})[ow.map.encounters];
    if (!table) return;
    var pool = table[rodOverride || slot] || table.grass;
    if (!pool || !pool.length) return;
    var entry = U.pickW(pool.map(function (e) { return [e, e[3] || 10]; }));
    var level = U.ri(entry[1], entry[2]);
    // repel check
    if (PKM.G.repel > 0) {
      var lead = PKM.G.party[PKM.State.firstAlive()];
      if (lead && level < lead.level) return;
    }
    var mon = PKM.Mon.make(entry[0], level);
    PKM.Battle.start({ kind: 'wild', enemy: mon, env: battleEnv() });
  }

  function battleEnv() {
    return {
      theme: ow.map.theme, weather: ow.map.weather || '',
      cave: ow.map.theme === 'cave' || ow.map.theme === 'distortion' || !!ow.map.indoor
    };
  }

  /* ------------------------------ interaction ----------------------------- */
  function interact() {
    var p = ow.player, d = U.DIRS[p.dir];
    var fx = Math.round(p.x) + d[0], fy = Math.round(p.y) + d[1];
    var n = npcAt(fx, fy);
    if (n) {
      n.dir = U.opposite[p.dir];
      if (n.trainer && !PKM.State.flag('tr_' + n.trainer)) {
        PKM.Events.engageTrainer(n);
      } else if (n.script) PKM.Events.run(n.script, { npc: n });
      else if (n.text) PKM.Dialog.say(n.text);
      return;
    }
    var it = itemAt(fx, fy);
    if (it) {
      PKM.State.setFlag(itemFlag(it));
      PKM.Events.giveItem(it.item, it.n || 1);
      return;
    }
    var ch = tileAt(fx, fy);
    if (ch === 'S') {
      var signs = ow.map.signs || [];
      for (var i = 0; i < signs.length; i++)
        if (signs[i].x === fx && signs[i].y === fy) { PKM.Dialog.say(signs[i].text); return; }
      PKM.Dialog.say('It\'s a wooden sign. The letters have faded.');
      return;
    }
    if (ch === 'T') {
      if (PKM.State.canUseField('cut'))
        PKM.Dialog.ask('A scrappy little tree. Chop it down with the Hatchet?', ['Chop', 'Leave it'], function (c) {
          if (c === 0) { ow.cleared[fx + ',' + fy] = true; PKM.Audio.sfx('hit'); }
        });
      else hintField('cut');
      return;
    }
    if (ch === 'R') {
      if (PKM.State.canUseField('rocksmash'))
        PKM.Dialog.ask('A cracked boulder. Smash it with the Miner\'s Hammer?', ['Smash', 'Leave it'], function (c) {
          if (c === 0) { ow.cleared[fx + ',' + fy] = true; PKM.Audio.sfx('superhit'); }
        });
      else hintField('rocksmash');
      return;
    }
    if (ch === 'B') {
      if (PKM.State.canUseField('strength'))
        PKM.Dialog.ask('A massive boulder. Shove it aside with the Power Gauntlets?', ['Shove', 'Leave it'], function (c) {
          if (c === 0) { ow.cleared[fx + ',' + fy] = true; PKM.Audio.sfx('superhit'); }
        });
      else hintField('strength');
      return;
    }
    if ((ch === '~' || ch === 's') && PKM.State.hasItem('fishing-rod') && !p.surfing) {
      PKM.Dialog.ask('Cast your Fishing Rod?', ['Fish', 'Cancel'], function (c) {
        if (c === 0) {
          if (U.chance(65)) { PKM.Dialog.say('Oh! A bite!', function () { spawnWild('fishing'); }); }
          else PKM.Dialog.say('Not even a nibble...');
        }
      });
      return;
    }
  }

  /* -------------------------------- trainers ------------------------------ */
  function checkTrainerSight() {
    if (ow.locked || ow.sightCooldown > 0) return;
    var p = ow.player;
    for (var i = 0; i < ow.npcs.length; i++) {
      var n = ow.npcs[i];
      if (!n.trainer || !n.sight || n.gone) continue;
      if (PKM.State.flag('tr_' + n.trainer)) continue;
      if (n.requires && !PKM.State.flag(n.requires)) continue;
      if (n.hidden && PKM.State.flag(n.hidden)) continue;
      var d = U.DIRS[n.dir], px = Math.round(p.x), py = Math.round(p.y);
      for (var s = 1; s <= n.sight; s++) {
        var tx = n.x + d[0] * s, ty = n.y + d[1] * s;
        if (px === tx && py === ty) { PKM.Events.trainerSpotted(n, s); return; }
        var ch = tileAt(tx, ty);
        if (!ch || (!WALKABLE[ch] && ch !== '~' && ch !== ',')) break;
        if (npcAt(tx, ty)) break;
      }
    }
  }

  /* --------------------------------- scene -------------------------------- */
  var scene = {
    update: function (dt) {
      ow.time += dt;
      var p = ow.player;
      if (p.bumpT > 0) p.bumpT -= dt;
      if (ow.sightCooldown > 0) ow.sightCooldown -= dt;

      // fade transitions
      if (ow.fadeDir !== 0) {
        ow.fade = U.clamp(ow.fade + ow.fadeDir * dt * 3.5, 0, 1);
        if (ow.fade >= 1 && ow.pendingWarp) {
          var w = ow.pendingWarp; ow.pendingWarp = null;
          loadMap(w.mapId, w.x, w.y, w.dir);
          ow.fadeDir = -1;
        } else if (ow.fade <= 0 && ow.fadeDir < 0) ow.fadeDir = 0;
        return;
      }

      // npc wander + scripted paths
      for (var i = 0; i < ow.npcs.length; i++) {
        var n = ow.npcs[i];
        if (n.moving) {
          n.t += dt * 3.2;
          if (n.t >= 1) { n.x = Math.round(n.x + n.dx); n.y = Math.round(n.y + n.dy); n.moving = false; n.t = 0; }
          continue;
        }
        if (n.pauseT > 0) { n.pauseT -= dt; continue; }
        if (n.path && n.path.length) {
          var c = n.path.shift();
          if (c === 'w') { n.pauseT = 0.55; continue; }
          var pdir = { u: 'up', d: 'down', l: 'left', r: 'right' }[c];
          if (pdir) {
            n.dir = pdir;
            var pdv = U.DIRS[pdir];
            n.moving = true; n.t = 0; n.dx = pdv[0]; n.dy = pdv[1];
          }
          continue;
        }
        if (n.pathDone) { var cb = n.pathDone; n.pathDone = null; cb(); continue; }
        if (ow.locked) continue;
        if (n.move === 'wander') {
          n.wt -= dt;
          if (n.wt <= 0) {
            n.wt = U.ri(1, 4);
            var dir = U.pick(['up', 'down', 'left', 'right']);
            n.dir = dir;
            var dv = U.DIRS[dir], nx2 = n.x + dv[0], ny2 = n.y + dv[1];
            if (Math.abs(nx2 - n.ox) <= (n.range || 2) && Math.abs(ny2 - n.oy) <= (n.range || 2) &&
                canEnter(nx2, ny2, dir, true) && tileAt(nx2, ny2) !== 'D' && !warpAt(nx2, ny2)) {
              n.moving = true; n.t = 0; n.dx = dv[0]; n.dy = dv[1];
            }
          }
        } else if (n.move === 'spin') {
          n.wt -= dt;
          if (n.wt <= 0) { n.wt = U.ri(1, 3); n.dir = U.pick(['up', 'down', 'left', 'right']); }
        }
      }

      if (ow.locked) return;

      // player movement
      if (p.moving) {
        var spd = p.jumping ? 3.2 : (p.bike ? 8 : (p.surfing ? 5 : (PKM.Input.held('b') ? 6.5 : 4.2)));
        if (PKM.fastMode) spd *= 1.7;
        p.t += dt * spd;
        if (p.t >= 1) arrive();
      } else {
        var d = PKM.Input.heldDir();
        if (d) tryMove(d);
        else if (PKM.Input.take('a')) interact();
        else if (PKM.Input.take('start')) PKM.Menu.openPause();
      }
      if (!p.moving) checkTrainerSight();
    },

    draw: function (ctx) {
      ctx.fillStyle = '#10131a'; ctx.fillRect(0, 0, VW, VH);
      if (!ow.map) return;
      PKM.GFX.tick(ow.time);
      var p = ow.player;
      var prog = p.moving ? p.t : 0;
      var px = (p.x + p.mx * prog) * T, py = (p.y + p.my * prog) * T;
      var camX = U.clamp(px - VW / 2 + T / 2, 0, Math.max(0, ow.w * T - VW));
      var camY = U.clamp(py - VH / 2 + T / 2, 0, Math.max(0, ow.h * T - VH));
      if (ow.w * T < VW) camX = (ow.w * T - VW) / 2;
      if (ow.h * T < VH) camY = (ow.h * T - VH) / 2;

      var x0 = Math.floor(camX / T), y0 = Math.floor(camY / T);
      var x1 = Math.min(ow.w - 1, x0 + Math.ceil(VW / T)), y1 = Math.min(ow.h - 1, y0 + Math.ceil(VH / T));
      var theme = ow.map.theme || 'outdoor';
      for (var ty = Math.max(0, y0); ty <= y1; ty++)
        for (var tx = Math.max(0, x0); tx <= x1; tx++)
          PKM.GFX.drawTile(ctx, theme, tileAt(tx, ty), tx * T - camX, ty * T - camY);

      // ground items
      (ow.map.items || []).forEach(function (it) {
        if (!PKM.State.flag(itemFlag(it))) PKM.GFX.drawBall(ctx, it.x * T - camX, it.y * T - camY);
      });

      // entities sorted by y
      var ents = [];
      ow.npcs.forEach(function (n) {
        if (n.gone) return;
        if (n.requires && !PKM.State.flag(n.requires)) return;
        if (n.hidden && PKM.State.flag(n.hidden)) return;
        var nprog = n.moving ? n.t : 0;
        ents.push({ y: (n.y + (n.dy || 0) * nprog), x: (n.x + (n.dx || 0) * nprog), npc: n });
      });
      ents.push({ y: p.y + p.my * prog, x: p.x + p.mx * prog, player: true });
      ents.sort(function (a, b) { return a.y - b.y; });
      var self = this;
      ents.forEach(function (e) {
        var ex = e.x * T - camX, ey = e.y * T - camY;
        if (e.player) {
          var jy = p.jumping ? -Math.sin(Math.min(1, p.t) * Math.PI) * 18 : 0;
          if (p.jumping) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(ex + 16, ey + 28, 10, 4, 0, 0, 7); ctx.fill(); }
          PKM.GFX.drawActor(ctx, PKM.G.gender === 'f' ? 'playerF' : 'player', p.dir, p.moving && p.t % .5 > .25 ? 1 : 0, ex, ey + jy, { surfing: p.surfing });
          if (!p.surfing && tileAt(Math.round(e.x), Math.round(e.y)) === ',') PKM.GFX.grassOverlay(ctx, theme, ex, ey);
        } else {
          var n = e.npc;
          PKM.GFX.drawActor(ctx, n.sprite || 'youngster', n.dir || 'down', n.moving && n.t % .5 > .25 ? 1 : 0, ex, ey);
          if (n.alert) { PKM.GFX.text(ctx, '!', ex + 12, ey - 26, { size: 24, bold: true, color: '#ff4040' }); }
          if (tileAt(Math.round(e.x), Math.round(e.y)) === ',') PKM.GFX.grassOverlay(ctx, theme, ex, ey);
        }
      });

      // weather overlays
      var wth = ow.map.weather;
      if (wth === 'rain') {
        ctx.strokeStyle = 'rgba(160,190,255,.4)'; ctx.lineWidth = 2;
        for (var r = 0; r < 60; r++) {
          var rx = ((r * 137 + ow.time * 700) % (VW + 80)) - 40, ry = (r * 211 + ow.time * 900) % VH;
          ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 6, ry + 14); ctx.stroke();
        }
        PKM.GFX.dim(ctx, .12);
      } else if (wth === 'snow') {
        ctx.fillStyle = 'rgba(255,255,255,.8)';
        for (var s = 0; s < 50; s++) {
          var sx = ((s * 173 + Math.sin(ow.time + s) * 40 + ow.time * 60) % VW + VW) % VW;
          var sy = (s * 131 + ow.time * 80) % VH;
          ctx.fillRect(sx, sy, 3, 3);
        }
      } else if (wth === 'fog' && !PKM.State.flag('defog_' + ow.mapId)) {
        ctx.fillStyle = 'rgba(200,205,215,.55)'; ctx.fillRect(0, 0, VW, VH);
      } else if (wth === 'sand') {
        ctx.fillStyle = 'rgba(220,190,120,.18)'; ctx.fillRect(0, 0, VW, VH);
      }

      // dark caves
      if (ow.map.dark && !PKM.State.canUseField('flash')) {
        var g = ctx.createRadialGradient(px - camX + 16, py - camY + 16, 60, px - camX + 16, py - camY + 16, 190);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.96)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
      }

      // location banner
      if (ow.time < 2.2 && ow.map.name) {
        PKM.GFX.panel(ctx, 14, 14, 300, 44, 'light');
        PKM.GFX.text(ctx, ow.map.name, 34, 26, { size: 20, bold: true, color: '#383830', shadow: false });
      }
      if (ow.fade > 0) PKM.GFX.dim(ctx, ow.fade);
    },

    /* API used by events/menus */
    state: ow, loadMap: loadMap, warpTo: warpTo, tileAt: tileAt,
    clearTile: function (x, y) { ow.cleared[x + ',' + y] = true; },
    lock: function () { ow.locked++; },
    unlock: function () { ow.locked = Math.max(0, ow.locked - 1); },
    battleEnv: battleEnv,
    npcById: function (id) {
      for (var i = 0; i < ow.npcs.length; i++) if (ow.npcs[i].id === id) return ow.npcs[i];
      return null;
    },
    enterFrom: function (saved) { loadMap(saved.map, saved.x, saved.y, saved.dir || 'down', { noEnter: false }); }
  };
  Object.defineProperty(scene, 'mapId', { get: function () { return ow.mapId; } });
  Object.defineProperty(scene, 'player', { get: function () { return ow.player; } });
  return scene;
})();
