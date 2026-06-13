/* Menus: pause, party, bag, summary, pokedex, trainer card, fly. */
PKM.Menu = (function () {
  var U = PKM.U, W = 960, H = 640;

  /* ------------------------------- pause menu ------------------------------ */
  function PauseScene() {
    this.overlay = true;
    this.items = [];
    if (PKM.State.flag('has_dex')) this.items.push('Pokedex');
    if (PKM.G.party.length) this.items.push('Pokemon');
    this.items.push('Bag');
    if (PKM.State.canUseField('fly')) this.items.push('Fly');
    this.items.push('Trainer Card', 'Save', 'Options', 'Close');
    this.idx = 0;
  }
  PauseScene.prototype.update = function () {
    var d = PKM.Input.menuDir();
    if (d === 'up') { this.idx = (this.idx + this.items.length - 1) % this.items.length; PKM.Audio.sfx('select'); }
    if (d === 'down') { this.idx = (this.idx + 1) % this.items.length; PKM.Audio.sfx('select'); }
    if (PKM.Input.take('b') || PKM.Input.take('start')) { PKM.Scenes.pop(this); PKM.Audio.sfx('cancel'); return; }
    if (PKM.Input.take('a')) {
      PKM.Audio.sfx('confirm');
      var sel = this.items[this.idx];
      if (sel === 'Close') { PKM.Scenes.pop(this); return; }
      if (sel === 'Pokedex') PKM.Scenes.push(new DexScene());
      if (sel === 'Pokemon') PKM.Scenes.push(new PartyScene({}));
      if (sel === 'Bag') PKM.Scenes.push(new BagScene({}));
      if (sel === 'Fly') PKM.Scenes.push(new FlyScene());
      if (sel === 'Trainer Card') PKM.Scenes.push(new CardScene());
      if (sel === 'Save') {
        var pause = this;
        PKM.Dialog.ask('Save your progress?', ['Save', 'Cancel'], function (i) {
          if (i === 0) {
            var ok = PKM.Save.save();
            PKM.Audio.sfx('save');
            PKM.Dialog.say(ok ? '{PLAYER} saved the game!' : 'Save failed (storage unavailable).');
          }
        });
      }
      if (sel === 'Options') {
        PKM.Dialog.ask('Options', ['Text speed: ' + ['Slow', 'Mid', 'Fast'][(PKM.G.options.textSpeed || 2) - 1], (PKM.Audio.isMuted() ? 'Sound: OFF' : 'Sound: ON'), 'Done'], function (i) {
          if (i === 0) { PKM.G.options.textSpeed = (PKM.G.options.textSpeed || 2) % 3 + 1; }
          if (i === 1) PKM.Audio.toggleMute();
        });
      }
    }
  };
  PauseScene.prototype.draw = function (ctx) {
    var w = 250, h = this.items.length * 38 + 28;
    PKM.GFX.panel(ctx, W - w - 14, 14, w, h);
    for (var i = 0; i < this.items.length; i++) {
      var sel = i === this.idx;
      PKM.GFX.text(ctx, this.items[i], W - w + 26, 32 + i * 38, { size: 20, bold: sel, color: sel ? '#ffe080' : '#f0f0f0' });
      if (sel) PKM.GFX.cursor(ctx, W - w + 2, 36 + i * 38, '#ffe080');
    }
  };

  /* -------------------------------- party --------------------------------- */
  function PartyScene(opts) {
    this.overlay = !opts.battle;
    this.opts = opts || {};
    this.idx = 0;
    this.moveFrom = -1;
  }
  PartyScene.prototype.update = function () {
    var party = PKM.G.party;
    var d = PKM.Input.menuDir();
    if (d === 'up') { this.idx = (this.idx + party.length - 1) % party.length; PKM.Audio.sfx('select'); }
    if (d === 'down') { this.idx = (this.idx + 1) % party.length; PKM.Audio.sfx('select'); }
    if (PKM.Input.take('b')) {
      if (this.opts.forced) { PKM.Audio.sfx('bump'); return; }
      PKM.Audio.sfx('cancel');
      PKM.Scenes.pop(this);
      if (this.opts.cb) this.opts.cb(-1);
      return;
    }
    if (PKM.Input.take('a')) {
      PKM.Audio.sfx('confirm');
      var self = this, mon = party[this.idx];
      if (this.opts.itemTarget) {
        PKM.Scenes.pop(this);
        this.opts.cb(this.idx);
        return;
      }
      if (this.opts.battle || this.opts.forSwitch) {
        if (mon.hp <= 0) { PKM.Dialog.say(PKM.Mon.name(mon) + ' is in no shape to battle!'); return; }
        if (this.idx === this.opts.currentIdx) { PKM.Dialog.say(PKM.Mon.name(mon) + ' is already out!'); return; }
        PKM.Scenes.pop(this);
        this.opts.cb(this.idx);
        return;
      }
      if (this.moveFrom >= 0) {
        var tmp = party[this.moveFrom]; party[this.moveFrom] = party[this.idx]; party[this.idx] = tmp;
        this.moveFrom = -1;
        return;
      }
      PKM.Dialog.ask(null, ['Summary', 'Switch', 'Item', 'Cancel'], function (i) {
        if (i === 0) PKM.Scenes.push(new SummaryScene(party, self.idx));
        if (i === 1) { self.moveFrom = self.idx; }
        if (i === 2) self.itemMenu(mon);
      });
    }
  };
  PartyScene.prototype.itemMenu = function (mon) {
    var self = this;
    if (mon.heldItem) {
      PKM.Dialog.ask(PKM.Mon.name(mon) + ' is holding ' + PKM.itemDef(mon.heldItem).name + '.', ['Take item', 'Cancel'], function (i) {
        if (i === 0) { PKM.State.addItem(mon.heldItem, 1); PKM.Dialog.say('Took the ' + PKM.itemDef(mon.heldItem).name + '.'); mon.heldItem = ''; }
      });
    } else {
      PKM.Scenes.push(new BagScene({ give: mon }));
    }
  };
  PartyScene.prototype.draw = function (ctx) {
    PKM.GFX.dim(ctx, .55);
    var party = PKM.G.party;
    PKM.GFX.text(ctx, this.opts.forced ? 'Choose your next Pokemon!' : 'POKEMON', 40, 18, { size: 22, bold: true });
    for (var i = 0; i < party.length; i++) {
      var mon = party[i], y = 56 + i * 92;
      PKM.GFX.panel(ctx, 30, y, 620, 84, i === this.idx ? undefined : 'light');
      PKM.Sprites.icon(ctx, mon.pokeId, 42, y + 12, 60);
      var col = i === this.idx ? '#ffe080' : (this.overlay ? '#f0f0f0' : '#f0f0f0');
      var dark = i === this.idx ? false : true;
      PKM.GFX.text(ctx, PKM.Mon.name(mon), 120, y + 12, { size: 20, bold: true, color: i === this.idx ? '#ffe080' : '#33332e', shadow: i === this.idx });
      PKM.GFX.text(ctx, 'Lv' + mon.level + ' ' + (mon.gender === 'm' ? '♂' : mon.gender === 'f' ? '♀' : ''), 340, y + 12, { size: 18, color: i === this.idx ? '#f0f0f0' : '#33332e', shadow: i === this.idx });
      PKM.GFX.hpBar(ctx, 120, y + 46, 220, mon.hp, PKM.Mon.maxHp(mon));
      PKM.GFX.text(ctx, mon.hp + '/' + PKM.Mon.maxHp(mon), 360, y + 40, { size: 16, color: i === this.idx ? '#f0f0f0' : '#33332e', shadow: i === this.idx });
      if (mon.status) {
        ctx.fillStyle = { par: '#d8b830', slp: '#9088a8', brn: '#e06030', psn: '#a050a8', tox: '#803088', frz: '#60b8d8' }[mon.status] || '#888';
        ctx.fillRect(470, y + 40, 44, 18);
        PKM.GFX.text(ctx, mon.status.toUpperCase(), 492, y + 42, { size: 12, align: 'center', bold: true });
      }
      if (mon.heldItem) PKM.GFX.text(ctx, '◦ ' + PKM.itemDef(mon.heldItem).name, 470, y + 12, { size: 14, color: i === this.idx ? '#c0c8e0' : '#555548', shadow: false });
      if (this.moveFrom === i) PKM.GFX.text(ctx, 'MOVE', 560, y + 40, { size: 14, bold: true, color: '#e84848', shadow: false });
    }
    PKM.GFX.text(ctx, 'Z: select   X: back', 700, H - 40, { size: 15, color: '#a8b0c0' });
  };

  /* ------------------------------- summary -------------------------------- */
  function SummaryScene(list, idx) { this.list = list; this.idx = idx; this.page = 0; }
  SummaryScene.prototype.update = function () {
    var d = PKM.Input.menuDir();
    if (d === 'left') { this.page = Math.max(0, this.page - 1); PKM.Audio.sfx('select'); }
    if (d === 'right') { this.page = Math.min(2, this.page + 1); PKM.Audio.sfx('select'); }
    if (d === 'up') { this.idx = (this.idx + this.list.length - 1) % this.list.length; PKM.Audio.sfx('select'); }
    if (d === 'down') { this.idx = (this.idx + 1) % this.list.length; PKM.Audio.sfx('select'); }
    if (PKM.Input.take('b')) { PKM.Scenes.pop(this); PKM.Audio.sfx('cancel'); }
  };
  SummaryScene.prototype.draw = function (ctx) {
    var mon = this.list[this.idx], sp = PKM.species(mon.pokeId);
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#3a4a6a'); grad.addColorStop(1, '#1c2438');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    ctx.save();
    if (mon.shiny) ctx.filter = 'hue-rotate(120deg)';
    PKM.Sprites.draw(ctx, mon.pokeId, 'front', 40, 110, 300);
    ctx.restore(); ctx.filter = 'none';
    PKM.GFX.text(ctx, PKM.Mon.name(mon) + (mon.shiny ? ' ★' : ''), 60, 36, { size: 26, bold: true });
    PKM.GFX.text(ctx, 'Lv' + mon.level + '  ' + (mon.gender === 'm' ? '♂' : mon.gender === 'f' ? '♀' : '—'), 60, 70, { size: 20 });
    sp.types.forEach(function (t, i) { PKM.GFX.typeBadge(ctx, t, 60 + i * 72, 420); });
    PKM.GFX.text(ctx, sp.genus || '', 60, 450, { size: 15, color: '#a8b0c8' });
    PKM.GFX.text(ctx, ['INFO', 'STATS', 'MOVES'][this.page] + '  (◄ ►)', W - 280, 36, { size: 18, color: '#ffe080', bold: true });

    var x = 420, y = 90;
    if (this.page === 0) {
      var rows = [
        ['Dex No.', '#' + sp.species], ['Species', sp.genus || '—'],
        ['Type', sp.types.map(U.cap).join(' / ')],
        ['Ability', U.title(mon.ability || '—')],
        ['Nature', PKM.Mon.NATURES[mon.nature][0]],
        ['Item', mon.heldItem ? PKM.itemDef(mon.heldItem).name : 'None'],
        ['OT', mon.ot], ['Friendship', mon.happy],
        ['Exp.', mon.exp], ['To next Lv.', PKM.Mon.expToNext(mon) === Infinity ? '—' : PKM.Mon.expToNext(mon)]
      ];
      rows.forEach(function (r, i) {
        PKM.GFX.text(ctx, r[0], x, y + i * 40, { size: 18, color: '#a8b0c8' });
        PKM.GFX.text(ctx, String(r[1]), x + 220, y + i * 40, { size: 18 });
      });
      var abilDesc = PKM.DATA.abilityNames && PKM.DATA.abilityNames[mon.ability];
      if (abilDesc) PKM.GFX.text(ctx, '', x, y + 420, { size: 14 });
    } else if (this.page === 1) {
      var names = ['HP', 'Attack', 'Defense', 'Sp. Atk', 'Sp. Def', 'Speed'];
      for (var i = 0; i < 6; i++) {
        var v = PKM.Mon.stat(mon, i);
        PKM.GFX.text(ctx, names[i], x, y + i * 56, { size: 19, color: '#a8b0c8' });
        PKM.GFX.text(ctx, String(i === 0 ? mon.hp + '/' + v : v), x + 180, y + i * 56, { size: 19, bold: true });
        ctx.fillStyle = '#404a68'; ctx.fillRect(x + 300, y + 8 + i * 56, 180, 10);
        ctx.fillStyle = '#68b8e8'; ctx.fillRect(x + 300, y + 8 + i * 56, Math.min(180, sp.stats[i]), 10);
      }
      PKM.GFX.text(ctx, 'IVs: ' + mon.ivs.join('/'), x, y + 350, { size: 14, color: '#788098' });
    } else {
      for (var m = 0; m < mon.moves.length; m++) {
        var mv = PKM.move(mon.moves[m].id);
        PKM.GFX.panel(ctx, x - 10, y + m * 86 - 10, 480, 76);
        ctx.fillStyle = PKM.TYPE_COLORS[mv.type]; ctx.fillRect(x + 4, y + m * 86 + 4, 10, 20);
        PKM.GFX.text(ctx, mv.name, x + 24, y + m * 86, { size: 20, bold: true });
        PKM.GFX.text(ctx, 'PP ' + mon.moves[m].pp + '/' + mon.moves[m].max, x + 300, y + m * 86, { size: 16 });
        PKM.GFX.text(ctx, (mv.cls === 'status' ? 'Status' : 'Pow ' + (mv.power || '—')) + '  Acc ' + (mv.acc || '—'), x + 24, y + m * 86 + 30, { size: 15, color: '#a8b0c8' });
      }
    }
    PKM.GFX.text(ctx, '▲▼: switch Pokemon   X: back', 40, H - 36, { size: 15, color: '#a8b0c0' });
  };

  /* --------------------------------- bag ---------------------------------- */
  var POCKETS = ['items', 'medicine', 'balls', 'key'];
  function BagScene(opts) {
    this.opts = opts || {};
    this.overlay = false;
    this.pocket = this.opts.battle ? 1 : 0;
    this.idx = 0;
  }
  BagScene.prototype.entries = function () {
    var pocket = POCKETS[this.pocket], out = [];
    for (var id in PKM.G.bag) {
      var def = PKM.itemDef(id);
      if (def.pocket === pocket) out.push({ id: id, def: def, n: PKM.G.bag[id] });
    }
    out.sort(function (a, b) { return a.def.name < b.def.name ? -1 : 1; });
    return out;
  };
  BagScene.prototype.update = function () {
    var d = PKM.Input.menuDir();
    var list = this.entries();
    if (d === 'left') { this.pocket = (this.pocket + 3) % 4; this.idx = 0; PKM.Audio.sfx('select'); }
    if (d === 'right') { this.pocket = (this.pocket + 1) % 4; this.idx = 0; PKM.Audio.sfx('select'); }
    if (d === 'up' && list.length) { this.idx = (this.idx + list.length - 1) % list.length; PKM.Audio.sfx('select'); }
    if (d === 'down' && list.length) { this.idx = (this.idx + 1) % list.length; PKM.Audio.sfx('select'); }
    if (PKM.Input.take('b')) {
      PKM.Audio.sfx('cancel');
      PKM.Scenes.pop(this);
      if (this.opts.cb) this.opts.cb(null);
      return;
    }
    if (PKM.Input.take('a') && list.length) {
      var entry = list[this.idx], self = this;
      PKM.Audio.sfx('confirm');
      if (this.opts.give) { // giving a held item
        var mon = this.opts.give;
        if (entry.def.key) { PKM.Dialog.say('You can\'t give that away!'); return; }
        PKM.State.takeItem(entry.id, 1);
        mon.heldItem = entry.id;
        PKM.Scenes.pop(this);
        PKM.Dialog.say(PKM.Mon.name(mon) + ' is now holding the ' + entry.def.name + '.');
        return;
      }
      if (this.opts.battle) {
        if (entry.def.pocket === 'key' || entry.def.repel || entry.def.escape) { PKM.Dialog.say('Not now!'); return; }
        if (entry.def.ball) { PKM.Scenes.pop(this); this.opts.cb(entry.id); return; }
        // medicine: pick target
        PKM.Scenes.push(new PartyScene({ itemTarget: true, cb: function (ti) {
          if (ti < 0) return;
          PKM.Scenes.pop(self);
          self.opts.cb(entry.id, ti);
        } }));
        return;
      }
      this.useFieldItem(entry);
    }
  };
  BagScene.prototype.useFieldItem = function (entry) {
    var self = this, def = entry.def, id = entry.id;
    if (def.ball) { PKM.Dialog.say('You can\'t use that here.'); return; }
    if (def.key) {
      if (id === 'bicycle') {
        if (PKM.MAPS[PKM.Overworld.mapId].indoor) { PKM.Dialog.say('Not in here!'); return; }
        var p = PKM.Overworld.player;
        p.bike = !p.bike;
        PKM.Scenes.pop(this);
        PKM.Dialog.say(p.bike ? '{PLAYER} hopped on the Bicycle!' : '{PLAYER} put away the Bicycle.');
      } else if (id === 'fishing-rod') {
        PKM.Dialog.say('Face the water and press Z to fish.');
      } else if (id === 'sky-shuttle-pass') {
        if (PKM.State.canUseField('fly')) PKM.Scenes.push(new FlyScene());
        else PKM.Dialog.say('The shuttle service requires the Relic Badge.');
      } else if (id === 'town-map') {
        PKM.Dialog.say('Sinnoh stretches from Twinleaf Town in the south to Snowpoint in the frozen north. The Pokemon League sits beyond Victory Road, northeast of Sunyshore.');
      } else {
        PKM.Dialog.say(def.desc || 'It might come in handy later.');
      }
      return;
    }
    if (def.repel) {
      if (PKM.G.repel > 0) { PKM.Dialog.say('A Repel is already in effect.'); return; }
      PKM.State.takeItem(id, 1); PKM.G.repel = def.repel;
      PKM.Dialog.say('{PLAYER} applied the ' + def.name + '. Weak wild Pokemon will stay away.');
      return;
    }
    if (def.escape) {
      var mp = PKM.MAPS[PKM.Overworld.mapId];
      if (!mp.escapeTo) { PKM.Dialog.say('Can\'t use that here.'); return; }
      PKM.State.takeItem(id, 1);
      PKM.Scenes.pop(this);
      PKM.Overworld.warpTo(mp.escapeTo[0], mp.escapeTo[1], mp.escapeTo[2], 'down');
      return;
    }
    // targeted items
    if (def.heal || def.cure || def.revive || def.candy || def.evo || def.pp || def.ppAll || def.held) {
      PKM.Scenes.push(new PartyScene({ itemTarget: true, cb: function (ti) {
        if (ti < 0) return;
        self.applyToMon(entry, PKM.G.party[ti]);
      } }));
      return;
    }
    PKM.Dialog.say('It probably shouldn\'t be used here.');
  };
  BagScene.prototype.applyToMon = function (entry, mon) {
    var def = entry.def, id = entry.id, name = PKM.Mon.name(mon);
    var max = PKM.Mon.maxHp(mon);
    if (def.held) {
      if (mon.heldItem) { PKM.Dialog.say(name + ' is already holding something.'); return; }
      PKM.State.takeItem(id, 1); mon.heldItem = id;
      PKM.Dialog.say(name + ' is now holding the ' + def.name + '.');
      return;
    }
    if (def.evo) {
      var edge = PKM.Mon.checkEvolve(mon, { item: id });
      if (!edge) { PKM.Dialog.say('It won\'t have any effect.'); return; }
      PKM.State.takeItem(id, 1);
      PKM.Battle.startEvolution(mon, edge, null);
      return;
    }
    if (def.revive) {
      if (mon.hp > 0) { PKM.Dialog.say('It won\'t have any effect.'); return; }
      PKM.State.takeItem(id, 1);
      mon.hp = Math.max(1, Math.floor(max * def.revive));
      PKM.Audio.sfx('heal'); PKM.Dialog.say(name + ' was revived!');
      return;
    }
    if (def.candy) {
      if (mon.level >= 100) { PKM.Dialog.say('It won\'t have any effect.'); return; }
      PKM.State.takeItem(id, 1);
      var self = this;
      PKM.Audio.sfx('levelup');
      var evs = PKM.Mon.gainExp(mon, PKM.Mon.expToNext(mon));
      var msgs = [name + ' grew to Lv. ' + mon.level + '!'];
      PKM.Dialog.say(msgs, function () { processMonEvents(mon, evs); });
      return;
    }
    if (mon.hp <= 0) { PKM.Dialog.say(name + ' has fainted. Use a Revive.'); return; }
    if (def.heal) {
      if (mon.hp >= max && !def.cure) { PKM.Dialog.say('It won\'t have any effect.'); return; }
      PKM.State.takeItem(id, 1);
      mon.hp = Math.min(max, mon.hp + def.heal);
      if (def.cure === 'all') mon.status = '';
      PKM.Audio.sfx('heal'); PKM.Dialog.say(name + '\'s HP was restored.');
      return;
    }
    if (def.cure) {
      var cures = def.cure === 'all' || mon.status === def.cure || (def.cure === 'psn' && mon.status === 'tox');
      if (!mon.status || !cures) { PKM.Dialog.say('It won\'t have any effect.'); return; }
      PKM.State.takeItem(id, 1); mon.status = '';
      PKM.Audio.sfx('heal'); PKM.Dialog.say(name + ' was cured!');
      return;
    }
    if (def.pp || def.ppAll) {
      PKM.State.takeItem(id, 1);
      mon.moves.forEach(function (ms) { ms.pp = Math.min(ms.max, ms.pp + (def.ppAll === 10 ? 10 : def.pp === 10 ? 10 : ms.max)); });
      if (def.ppAll === undefined && def.pp) mon.moves.forEach(function (ms) { ms.pp = Math.min(ms.max, ms.pp); });
      PKM.Audio.sfx('heal'); PKM.Dialog.say(name + '\'s PP was restored.');
      return;
    }
  };
  BagScene.prototype.draw = function (ctx) {
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#4a3a28'); grad.addColorStop(1, '#2a2018');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    var names = ['ITEMS', 'MEDICINE', 'POKE BALLS', 'KEY ITEMS'];
    for (var t = 0; t < 4; t++) {
      var sel = t === this.pocket;
      PKM.GFX.text(ctx, names[t], 60 + t * 200, 30, { size: 19, bold: sel, color: sel ? '#ffe080' : '#988868' });
    }
    var list = this.entries();
    if (!list.length) PKM.GFX.text(ctx, '(empty)', 80, 110, { size: 18, color: '#a89878' });
    var top = Math.max(0, Math.min(this.idx - 5, list.length - 11));
    for (var i = top; i < Math.min(list.length, top + 11); i++) {
      var e = list[i], y = 80 + (i - top) * 44, isSel = i === this.idx;
      PKM.GFX.text(ctx, e.def.name, 90, y, { size: 19, bold: isSel, color: isSel ? '#ffe080' : '#f0e8d8' });
      if (!e.def.key) PKM.GFX.text(ctx, 'x' + e.n, 480, y, { size: 17, color: isSel ? '#ffe080' : '#c8b898' });
      if (isSel) PKM.GFX.cursor(ctx, 64, y + 4, '#ffe080');
    }
    PKM.GFX.panel(ctx, 580, 80, 350, 200);
    if (list[this.idx]) {
      ctx.font = '16px Consolas, monospace';
      var lines = U.wrap(ctx, list[this.idx].def.desc || '', 310);
      lines.slice(0, 6).forEach(function (l, i) { PKM.GFX.text(ctx, l, 600, 100 + i * 24, { size: 16 }); });
    }
    PKM.GFX.text(ctx, '◄ ►: pocket   Z: use   X: back', 600, H - 40, { size: 15, color: '#a8b0c0' });
  };

  function processMonEvents(mon, events) {
    var moveEvents = events.filter(function (e) { return e.type === 'move'; });
    var evoEvent = events.filter(function (e) { return e.type === 'evolve'; })[0];
    var next = function () {
      if (moveEvents.length) {
        var ev = moveEvents.shift();
        if (PKM.Mon.teach(mon, ev.moveId)) {
          PKM.Dialog.say(PKM.Mon.name(mon) + ' learned ' + PKM.move(ev.moveId).name + '!', next);
        } else {
          var m2 = PKM.move(ev.moveId);
          var opts = mon.moves.map(function (ms) { return PKM.move(ms.id).name; }).concat(['Skip ' + m2.name]);
          PKM.Dialog.ask('Forget a move to learn ' + m2.name + '?', opts, function (i) {
            if (i >= 0 && i < 4) { mon.moves[i] = { id: ev.moveId, pp: m2.pp, max: m2.pp }; PKM.Dialog.say('Learned ' + m2.name + '!', next); }
            else next();
          }, { cancel: false });
        }
        return;
      }
      if (evoEvent) {
        var edge = PKM.Mon.checkEvolve(mon, {});
        if (edge) PKM.Battle.startEvolution(mon, edge, null);
      }
    };
    next();
  }

  /* -------------------------------- pokedex -------------------------------- */
  function DexScene() { this.idx = 0; this.list = PKM.DATA.dexOrder; }
  DexScene.prototype.update = function () {
    var d = PKM.Input.menuDir();
    if (d === 'up') { this.idx = (this.idx + this.list.length - 1) % this.list.length; PKM.Audio.sfx('select'); }
    if (d === 'down') { this.idx = (this.idx + 1) % this.list.length; PKM.Audio.sfx('select'); }
    if (d === 'left') this.idx = Math.max(0, this.idx - 10);
    if (d === 'right') this.idx = Math.min(this.list.length - 1, this.idx + 10);
    if (PKM.Input.take('b')) { PKM.Scenes.pop(this); PKM.Audio.sfx('cancel'); }
  };
  DexScene.prototype.draw = function (ctx) {
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#8a2828'); grad.addColorStop(1, '#481414');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    var counts = PKM.State.dexCounts();
    PKM.GFX.text(ctx, 'POKEDEX', 40, 24, { size: 26, bold: true });
    PKM.GFX.text(ctx, 'SEEN ' + counts.seen + '   CAUGHT ' + counts.caught + ' / ' + counts.total + ' species', 280, 32, { size: 17, color: '#f0c8c8' });
    var top = Math.max(0, Math.min(this.idx - 6, this.list.length - 13));
    for (var i = top; i < Math.min(this.list.length, top + 13); i++) {
      var sp = this.list[i], y = 76 + (i - top) * 40, sel = i === this.idx;
      var seen = PKM.G.dex.seen[sp.id], caught = PKM.G.dex.caught[sp.id];
      var label = (sp.id === sp.species ? '#' + U.pad(sp.species, 4) : '  ↳  ') + ' ' + (seen ? sp.name : '---------');
      PKM.GFX.text(ctx, label, 70, y, { size: 18, bold: sel, color: sel ? '#ffe080' : '#f0e0e0' });
      if (caught) { ctx.fillStyle = '#e84848'; ctx.beginPath(); ctx.arc(52, y + 10, 7, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(45, y + 9, 14, 2); }
      if (sel) PKM.GFX.cursor(ctx, 26, y + 4, '#ffe080');
    }
    var cur = this.list[this.idx];
    PKM.GFX.panel(ctx, 540, 70, 390, 480);
    if (PKM.G.dex.seen[cur.id]) {
      PKM.Sprites.draw(ctx, cur.id, 'front', 620, 90, 230);
      PKM.GFX.text(ctx, cur.name, 735, 330, { size: 22, bold: true, align: 'center' });
      PKM.GFX.text(ctx, cur.genus || '', 735, 360, { size: 15, align: 'center', color: '#c8d0e0' });
      cur.types.forEach(function (t, i) { PKM.GFX.typeBadge(ctx, t, 660 + i * 76, 388); });
      if (PKM.G.dex.caught[cur.id]) {
        PKM.GFX.text(ctx, 'HT ' + (cur.height / 10) + 'm   WT ' + (cur.weight / 10) + 'kg', 735, 420, { size: 15, align: 'center', color: '#c8d0e0' });
        PKM.GFX.text(ctx, 'Gen ' + cur.gen + (cur.legend ? (cur.legend === 2 ? '  MYTHICAL' : '  LEGENDARY') : ''), 735, 446, { size: 15, align: 'center', color: '#e8c880' });
        var names = ['HP', 'AT', 'DF', 'SA', 'SD', 'SP'];
        for (var s = 0; s < 6; s++) {
          PKM.GFX.text(ctx, names[s], 590 + s * 56, 480, { size: 13, color: '#c8d0e0' });
          PKM.GFX.text(ctx, String(cur.stats[s]), 590 + s * 56, 500, { size: 15, bold: true });
        }
      }
    } else {
      PKM.GFX.text(ctx, '?', 735, 180, { size: 90, align: 'center', color: '#684040' });
    }
    PKM.GFX.text(ctx, '▲▼: scroll  ◄ ►: page  X: back', 40, H - 36, { size: 15, color: '#e0b0b0' });
  };

  /* ------------------------------ trainer card ----------------------------- */
  function CardScene() {}
  CardScene.prototype.update = function () {
    if (PKM.Input.take('b') || PKM.Input.take('a')) { PKM.Scenes.pop(this); PKM.Audio.sfx('cancel'); }
  };
  CardScene.prototype.draw = function (ctx) {
    var grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#2a4a8a'); grad.addColorStop(1, '#102448');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    PKM.GFX.panel(ctx, 90, 90, W - 180, H - 200);
    PKM.GFX.text(ctx, 'TRAINER CARD', 130, 120, { size: 24, bold: true, color: '#ffe080' });
    PKM.GFX.text(ctx, 'NAME    ' + PKM.G.name, 130, 180, { size: 22 });
    PKM.GFX.text(ctx, 'MONEY   ' + U.fmtMoney(PKM.G.money), 130, 230, { size: 22 });
    var counts = PKM.State.dexCounts();
    PKM.GFX.text(ctx, 'POKEDEX ' + counts.caught + ' caught / ' + counts.seen + ' seen', 130, 280, { size: 22 });
    var hrs = Math.floor(PKM.G.playSec / 3600), mins = Math.floor(PKM.G.playSec / 60) % 60;
    PKM.GFX.text(ctx, 'TIME    ' + hrs + ':' + U.pad(mins, 2), 130, 330, { size: 22 });
    PKM.GFX.text(ctx, 'BADGES', 130, 390, { size: 22 });
    var badgeNames = ['Coal', 'Forest', 'Relic', 'Cobble', 'Fen', 'Mine', 'Icicle', 'Beacon'];
    for (var i = 0; i < 8; i++) {
      var has = PKM.G.badges[i];
      ctx.fillStyle = has ? ['#b06030', '#48a048', '#a048a0', '#888898', '#4878c8', '#988878', '#68c0d8', '#d8b830'][i] : 'rgba(255,255,255,.12)';
      ctx.beginPath(); ctx.arc(160 + i * 80, 460, 24, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.stroke();
      PKM.GFX.text(ctx, badgeNames[i], 160 + i * 80, 496, { size: 12, align: 'center', color: has ? '#f0f0f0' : '#687088' });
    }
    PKM.Sprites.icon(ctx, PKM.G.party.length ? PKM.G.party[0].pokeId : 25, W - 280, 160, 140);
  };

  /* --------------------------------- fly ----------------------------------- */
  var FLY_SPOTS = [
    ['twinleaf', 'Twinleaf Town', 'twinleaf', 11, 16], ['sandgem', 'Sandgem Town', 'sandgem', 10, 10],
    ['jubilife', 'Jubilife City', 'jubilife', 19, 17], ['oreburgh', 'Oreburgh City', 'oreburgh', 12, 15],
    ['floaroma', 'Floaroma Town', 'floaroma', 12, 12], ['eterna', 'Eterna City', 'eterna', 12, 14],
    ['hearthome', 'Hearthome City', 'hearthome', 17, 16], ['solaceon', 'Solaceon Town', 'solaceon', 11, 11],
    ['veilstone', 'Veilstone City', 'veilstone', 15, 18], ['pastoria', 'Pastoria City', 'pastoria', 13, 13],
    ['celestic', 'Celestic Town', 'celestic', 12, 11], ['canalave', 'Canalave City', 'canalave', 13, 14],
    ['snowpoint', 'Snowpoint City', 'snowpoint', 12, 13], ['sunyshore', 'Sunyshore City', 'sunyshore', 13, 14],
    ['league', 'Pokemon League', 'league_front', 10, 14], ['fight', 'Fight Area', 'fight_area', 10, 12]
  ];
  function FlyScene() {
    this.spots = FLY_SPOTS.filter(function (s) { return PKM.G.visited[s[0]] && PKM.MAPS[s[2]]; });
    this.idx = 0;
  }
  FlyScene.prototype.update = function () {
    var d = PKM.Input.menuDir();
    if (d === 'up') { this.idx = (this.idx + this.spots.length - 1) % this.spots.length; PKM.Audio.sfx('select'); }
    if (d === 'down') { this.idx = (this.idx + 1) % this.spots.length; PKM.Audio.sfx('select'); }
    if (PKM.Input.take('b')) { PKM.Scenes.pop(this); PKM.Audio.sfx('cancel'); return; }
    if (PKM.Input.take('a') && this.spots.length) {
      var s = this.spots[this.idx];
      PKM.Audio.sfx('confirm');
      while (PKM.Scenes.top() !== PKM.Overworld) PKM.Scenes.pop(PKM.Scenes.top());
      PKM.Overworld.warpTo(s[2], s[3], s[4], 'down');
    }
  };
  FlyScene.prototype.draw = function (ctx) {
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#284878'); grad.addColorStop(1, '#102038');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    PKM.GFX.text(ctx, 'SKY SHUTTLE — choose a destination', 60, 36, { size: 22, bold: true });
    for (var i = 0; i < this.spots.length; i++) {
      var sel = i === this.idx;
      var col = i % 2, row = Math.floor(i / 2);
      PKM.GFX.text(ctx, this.spots[i][1], 120 + col * 420, 100 + row * 52, { size: 20, bold: sel, color: sel ? '#ffe080' : '#e0e8f0' });
      if (sel) PKM.GFX.cursor(ctx, 92 + col * 420, 104 + row * 52, '#ffe080');
    }
    PKM.GFX.text(ctx, 'Z: fly   X: back', 60, H - 40, { size: 15, color: '#a8b0c0' });
  };

  return {
    openPause: function () { PKM.Scenes.push(new PauseScene()); PKM.Audio.sfx('confirm'); },
    openParty: function (opts) { PKM.Scenes.push(new PartyScene(opts || {})); },
    openBag: function (opts) { PKM.Scenes.push(new BagScene(opts || {})); },
    openSummary: function (list, idx) { PKM.Scenes.push(new SummaryScene(list, idx)); },
    openDex: function () { PKM.Scenes.push(new DexScene()); },
    processMonEvents: processMonEvents
  };
})();
