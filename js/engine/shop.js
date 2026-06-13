/* Poke Mart buy/sell. */
PKM.Shop = (function () {
  var U = PKM.U, W = 960, H = 640;

  function Scene(stock) {
    this.stock = stock; // array of itemIds
    this.mode = 'root'; this.idx = 0; this.qty = 1;
  }
  Scene.prototype.sellables = function () {
    var out = [];
    for (var id in PKM.G.bag) {
      var def = PKM.itemDef(id);
      if (!def.key && def.price > 0) out.push({ id: id, def: def, n: PKM.G.bag[id] });
    }
    out.sort(function (a, b) { return a.def.name < b.def.name ? -1 : 1; });
    return out;
  };
  Scene.prototype.update = function () {
    var d = PKM.Input.menuDir();
    if (this.mode === 'root') {
      if (d === 'up' || d === 'down') { this.idx = (this.idx + 1) % 2; PKM.Audio.sfx('select'); }
      if (PKM.Input.take('b')) { PKM.Scenes.pop(this); PKM.Audio.sfx('cancel'); return; }
      if (PKM.Input.take('a')) { PKM.Audio.sfx('confirm'); this.mode = this.idx === 0 ? 'buy' : 'sell'; this.idx = 0; this.qty = 1; }
      return;
    }
    var list = this.mode === 'buy' ? this.stock : this.sellables();
    if (!list.length && this.mode === 'sell') { this.mode = 'root'; PKM.Dialog.say('You have nothing to sell.'); return; }
    if (d === 'up') { this.idx = (this.idx + list.length - 1) % list.length; this.qty = 1; PKM.Audio.sfx('select'); }
    if (d === 'down') { this.idx = (this.idx + 1) % list.length; this.qty = 1; PKM.Audio.sfx('select'); }
    if (d === 'left') this.qty = Math.max(1, this.qty - 1);
    if (d === 'right') this.qty = Math.min(99, this.qty + 1);
    if (PKM.Input.take('b')) { this.mode = 'root'; this.idx = 0; PKM.Audio.sfx('cancel'); return; }
    if (PKM.Input.take('a')) {
      var self = this;
      if (this.mode === 'buy') {
        var id = list[this.idx], def = PKM.itemDef(id);
        var cost = def.price * this.qty;
        if (cost > PKM.G.money) { PKM.Dialog.say('You can\'t afford that!'); return; }
        PKM.Dialog.ask(def.name + ' x' + this.qty + ' will be ' + U.fmtMoney(cost) + '. OK?', ['Buy', 'Cancel'], function (i) {
          if (i === 0) {
            PKM.State.addMoney(-cost);
            PKM.State.addItem(id, self.qty);
            PKM.Audio.sfx('buy');
            PKM.Dialog.say('Here you are! Thank you!');
            self.qty = 1;
          }
        });
      } else {
        var e = list[this.idx];
        var q = Math.min(this.qty, e.n);
        var gain = Math.floor(e.def.price / 2) * q;
        PKM.Dialog.ask('Sell ' + e.def.name + ' x' + q + ' for ' + U.fmtMoney(gain) + '?', ['Sell', 'Cancel'], function (i) {
          if (i === 0) {
            PKM.State.takeItem(e.id, q);
            PKM.State.addMoney(gain);
            PKM.Audio.sfx('buy');
            self.qty = 1; self.idx = 0;
          }
        });
      }
    }
  };
  Scene.prototype.draw = function (ctx) {
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#2a4868'); grad.addColorStop(1, '#142434');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    PKM.GFX.text(ctx, 'POKE MART', 50, 26, { size: 24, bold: true });
    PKM.GFX.text(ctx, 'Money: ' + U.fmtMoney(PKM.G.money), 640, 32, { size: 19, color: '#ffe080' });
    if (this.mode === 'root') {
      PKM.GFX.panel(ctx, 60, 90, 280, 130);
      ['Buy', 'Sell'].forEach((function (o, i) {
        var sel = this.idx === i;
        PKM.GFX.text(ctx, o, 120, 116 + i * 44, { size: 22, bold: sel, color: sel ? '#ffe080' : '#f0f0f0' });
        if (sel) PKM.GFX.cursor(ctx, 90, 121 + i * 44, '#ffe080');
      }).bind(this));
      return;
    }
    var list = this.mode === 'buy' ? this.stock : this.sellables();
    var top = Math.max(0, Math.min(this.idx - 5, list.length - 10));
    for (var i = top; i < Math.min(list.length, top + 10); i++) {
      var y = 90 + (i - top) * 46, sel2 = i === this.idx;
      var id2 = this.mode === 'buy' ? list[i] : list[i].id;
      var def2 = PKM.itemDef(id2);
      PKM.GFX.text(ctx, def2.name, 100, y, { size: 19, bold: sel2, color: sel2 ? '#ffe080' : '#f0f0f0' });
      var price = this.mode === 'buy' ? def2.price : Math.floor(def2.price / 2);
      PKM.GFX.text(ctx, U.fmtMoney(price), 480, y, { size: 17, color: sel2 ? '#ffe080' : '#b8c0d0' });
      if (this.mode === 'sell') PKM.GFX.text(ctx, 'x' + list[i].n, 610, y, { size: 16, color: '#b8c0d0' });
      if (sel2) PKM.GFX.cursor(ctx, 72, y + 4, '#ffe080');
    }
    PKM.GFX.panel(ctx, 700, 90, 230, 130);
    PKM.GFX.text(ctx, 'Qty:  ◄ ' + this.qty + ' ►', 730, 116, { size: 20 });
    var cur = this.mode === 'buy' ? PKM.itemDef(list[this.idx]) : list[this.idx] && list[this.idx].def;
    if (cur) {
      var total = (this.mode === 'buy' ? cur.price : Math.floor(cur.price / 2)) * this.qty;
      PKM.GFX.text(ctx, U.fmtMoney(total), 730, 156, { size: 20, color: '#ffe080' });
    }
    if (cur) {
      PKM.GFX.panel(ctx, 700, 240, 230, 200);
      ctx.font = '15px Consolas, monospace';
      U.wrap(ctx, cur.desc || '', 196).slice(0, 7).forEach(function (l, j) {
        PKM.GFX.text(ctx, l, 716, 258 + j * 22, { size: 15 });
      });
    }
    PKM.GFX.text(ctx, 'Z: confirm   X: back', 60, H - 40, { size: 15, color: '#a8b0c0' });
  };

  return { open: function (stock) { PKM.Scenes.push(new Scene(stock)); } };
})();
