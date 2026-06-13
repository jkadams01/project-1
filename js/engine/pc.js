/* Pokemon Storage System (PC boxes). */
PKM.PC = (function () {
  var U = PKM.U, W = 960, H = 640;
  var COLS = 6, ROWS = 5;

  function Scene() {
    this.box = 0;
    this.cx = 0; this.cy = 0; // grid cursor; cy === ROWS -> party strip
    this.held = null; // {mon, from:'box'|'party', idx}
  }
  Scene.prototype.update = function () {
    var G = PKM.G;
    var d = PKM.Input.menuDir();
    if (d === 'left') { if (this.cy === -1) { this.box = (this.box + G.boxes.length - 1) % G.boxes.length; } else this.cx = (this.cx + (this.cy === ROWS ? 5 : COLS)) % (this.cy === ROWS ? 6 : COLS); PKM.Audio.sfx('select'); }
    if (d === 'right') { if (this.cy === -1) { this.box = (this.box + 1) % G.boxes.length; } else this.cx = (this.cx + 1) % (this.cy === ROWS ? 6 : COLS); PKM.Audio.sfx('select'); }
    if (d === 'up') { this.cy = Math.max(-1, this.cy - 1); if (this.cy === -1) this.cx = 0; PKM.Audio.sfx('select'); }
    if (d === 'down') { this.cy = Math.min(ROWS, this.cy + 1); PKM.Audio.sfx('select'); }
    if (PKM.Input.take('b')) {
      if (this.held) { this.returnHeld(); return; }
      PKM.Scenes.pop(this); PKM.Audio.sfx('cancel'); return;
    }
    if (PKM.Input.take('a')) {
      if (this.cy === -1) return;
      var self = this;
      if (this.cy === ROWS) { // party strip
        var pi = this.cx;
        if (this.held) {
          if (pi <= G.party.length && G.party.length < 6) {
            G.party.splice(Math.min(pi, G.party.length), 0, this.held.mon);
            this.held = null; PKM.Audio.sfx('confirm');
          } else if (G.party[pi]) { // swap
            var tmp = G.party[pi]; G.party[pi] = this.held.mon; this.held.mon = tmp; PKM.Audio.sfx('confirm');
          }
          return;
        }
        if (G.party[pi]) {
          if (G.party.filter(function (m) { return m.hp > 0; }).length <= 1 && G.party[pi].hp > 0 && G.party.length === 1) {
            PKM.Dialog.say('That\'s your last Pokemon!'); return;
          }
          this.menuFor(G.party[pi], 'party', pi);
        }
        return;
      }
      var slot = this.cy * COLS + this.cx;
      var box = G.boxes[this.box];
      if (this.held) {
        if (slot >= box.length) { box.push(this.held.mon); }
        else { var t2 = box[slot]; box[slot] = this.held.mon; this.held.mon = t2; PKM.Audio.sfx('confirm'); return; }
        this.held = null; PKM.Audio.sfx('confirm');
        return;
      }
      if (box[slot]) this.menuFor(box[slot], 'box', slot);
    }
  };
  Scene.prototype.menuFor = function (mon, from, idx) {
    var self = this, G = PKM.G;
    PKM.Dialog.ask(PKM.Mon.name(mon) + ' (Lv' + mon.level + ')', ['Pick up', 'Summary', 'Release', 'Cancel'], function (i) {
      if (i === 0) {
        if (from === 'party') {
          var alive = G.party.filter(function (m, j) { return m.hp > 0 && j !== idx; }).length;
          if (G.party.length === 1) { PKM.Dialog.say('It\'s your only Pokemon!'); return; }
          if (alive === 0) { PKM.Dialog.say('You need at least one healthy Pokemon with you!'); return; }
          self.held = { mon: G.party.splice(idx, 1)[0] };
        } else {
          self.held = { mon: G.boxes[self.box].splice(idx, 1)[0] };
        }
      }
      if (i === 1) PKM.Menu.openSummary([mon], 0);
      if (i === 2) {
        if (from === 'party' && G.party.length === 1) { PKM.Dialog.say('It\'s your only Pokemon!'); return; }
        PKM.Dialog.ask('Release ' + PKM.Mon.name(mon) + ' back to the wild?', ['Release', 'Cancel'], function (r) {
          if (r === 0) {
            if (from === 'party') G.party.splice(idx, 1); else G.boxes[self.box].splice(idx, 1);
            PKM.Dialog.say('Bye-bye, ' + PKM.Mon.name(mon) + '! Be good out there.');
          }
        });
      }
    });
  };
  Scene.prototype.returnHeld = function () {
    var G = PKM.G;
    var box = G.boxes[this.box];
    if (box.length < 30) box.push(this.held.mon);
    else if (G.party.length < 6) G.party.push(this.held.mon);
    this.held = null;
    PKM.Audio.sfx('cancel');
  };
  Scene.prototype.draw = function (ctx) {
    var G = PKM.G;
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#28484a'); grad.addColorStop(1, '#102426');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    PKM.GFX.text(ctx, '◄  BOX ' + (this.box + 1) + '  ►', 200, 26, { size: 22, bold: this.cy === -1, color: this.cy === -1 ? '#ffe080' : '#f0f0f0' });
    PKM.GFX.text(ctx, (G.boxes[this.box].length) + '/30', 360, 30, { size: 16, color: '#a0c0c0' });
    var box = G.boxes[this.box];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var x = 60 + c * 88, y = 70 + r * 88;
      var sel = this.cy === r && this.cx === c;
      ctx.fillStyle = sel ? 'rgba(255,224,128,.25)' : 'rgba(255,255,255,.07)';
      ctx.fillRect(x, y, 80, 80);
      if (sel) { ctx.strokeStyle = '#ffe080'; ctx.strokeRect(x + .5, y + .5, 79, 79); }
      var m = box[r * COLS + c];
      if (m) PKM.Sprites.icon(ctx, m.pokeId, x + 8, y + 8, 64);
    }
    PKM.GFX.text(ctx, 'PARTY', 620, 70, { size: 18, bold: true, color: '#a0e0d0' });
    for (var p = 0; p < 6; p++) {
      var px = 620 + (p % 2) * 150, py = 100 + Math.floor(p / 2) * 110;
      var psel = this.cy === ROWS && this.cx === p;
      ctx.fillStyle = psel ? 'rgba(255,224,128,.25)' : 'rgba(255,255,255,.07)';
      ctx.fillRect(px, py, 140, 100);
      if (psel) { ctx.strokeStyle = '#ffe080'; ctx.strokeRect(px + .5, py + .5, 139, 99); }
      var pm = G.party[p];
      if (pm) {
        PKM.Sprites.icon(ctx, pm.pokeId, px + 6, py + 6, 56);
        PKM.GFX.text(ctx, PKM.Mon.name(pm).slice(0, 10), px + 8, py + 64, { size: 13 });
        PKM.GFX.text(ctx, 'Lv' + pm.level, px + 8, py + 80, { size: 12, color: '#a0c0c0' });
      }
    }
    if (this.held) {
      PKM.Sprites.icon(ctx, this.held.mon.pokeId, W / 2 - 32, H - 110, 64);
      PKM.GFX.text(ctx, 'Holding: ' + PKM.Mon.name(this.held.mon), W / 2 + 44, H - 90, { size: 17, color: '#ffe080' });
    }
    PKM.GFX.text(ctx, 'Z: pick up / place   X: back', 60, H - 40, { size: 15, color: '#a0c0c0' });
  };

  return { open: function () { PKM.Scenes.push(new Scene()); } };
})();
