/* Dialogue box + choice menus, pushed as overlay scenes. */
PKM.Dialog = (function () {
  var W = 960, H = 640;

  function interp(s) {
    var G = PKM.G || {};
    return String(s).replace(/\{PLAYER\}/g, G.name || 'YOU').replace(/\{RIVAL\}/g, G.rivalName || 'BARRY');
  }

  function resolve(textOrKey) {
    var d = PKM.DATA.dialogue || {};
    var v = d[textOrKey] !== undefined ? d[textOrKey] : textOrKey;
    return Array.isArray(v) ? v.slice() : [v];
  }

  function DialogScene(pages, cb) {
    this.overlay = true;
    this.pages = pages.map(interp);
    this.page = 0; this.chars = 0; this.done = false; this.cb = cb;
  }
  DialogScene.prototype.update = function (dt) {
    var speed = (PKM.fastMode ? 160 : 60) * dt * (PKM.G && PKM.G.options.textSpeed || 2);
    var txt = this.pages[this.page];
    if (this.chars < txt.length) {
      this.chars = Math.min(txt.length, this.chars + speed);
      if (PKM.Input.take('a') || PKM.Input.take('b')) this.chars = txt.length;
      return;
    }
    if (PKM.Input.take('a') || PKM.Input.take('b')) {
      PKM.Audio.sfx('select');
      this.page++;
      this.chars = 0;
      if (this.page >= this.pages.length) {
        PKM.Scenes.pop(this);
        if (this.cb) this.cb();
      }
    }
  };
  DialogScene.prototype.draw = function (ctx) {
    var bx = 16, bh = 130, by = H - bh - 12, bw = W - 32;
    PKM.GFX.panel(ctx, bx, by, bw, bh);
    var txt = this.pages[this.page].slice(0, Math.floor(this.chars));
    ctx.font = '20px Consolas, monospace';
    var lines = PKM.U.wrap(ctx, txt, bw - 56);
    for (var i = 0; i < Math.min(4, lines.length); i++)
      PKM.GFX.text(ctx, lines[i], bx + 26, by + 20 + i * 26, { size: 20 });
    if (this.chars >= this.pages[this.page].length && Math.floor(Date.now() / 400) % 2)
      PKM.GFX.cursor(ctx, bx + bw - 34, by + bh - 28, '#e84848');
  };

  function ChoiceScene(prompt, options, cb, opts) {
    this.overlay = true;
    this.prompt = prompt ? interp(prompt) : null;
    this.options = options; this.cb = cb; this.idx = 0;
    this.allowCancel = !opts || opts.cancel !== false;
  }
  ChoiceScene.prototype.update = function () {
    var d = PKM.Input.menuDir();
    if (d === 'up') { this.idx = (this.idx + this.options.length - 1) % this.options.length; PKM.Audio.sfx('select'); }
    if (d === 'down') { this.idx = (this.idx + 1) % this.options.length; PKM.Audio.sfx('select'); }
    if (PKM.Input.take('a')) {
      PKM.Audio.sfx('confirm');
      var i = this.idx; PKM.Scenes.pop(this);
      if (this.cb) this.cb(i);
    } else if (this.allowCancel && PKM.Input.take('b')) {
      PKM.Audio.sfx('cancel');
      PKM.Scenes.pop(this);
      if (this.cb) this.cb(-1);
    }
  };
  ChoiceScene.prototype.draw = function (ctx) {
    if (this.prompt) {
      var bx = 16, bh = 130, by = H - bh - 12, bw = W - 32;
      PKM.GFX.panel(ctx, bx, by, bw, bh);
      ctx.font = '20px Consolas, monospace';
      var lines = PKM.U.wrap(ctx, this.prompt, bw - 56);
      for (var i = 0; i < Math.min(4, lines.length); i++)
        PKM.GFX.text(ctx, lines[i], bx + 26, by + 20 + i * 26, { size: 20 });
    }
    var w = 0;
    ctx.font = '700 20px Consolas, monospace';
    this.options.forEach(function (o) { w = Math.max(w, ctx.measureText(o).width); });
    w += 64;
    var h = this.options.length * 32 + 24;
    var x = W - w - 20, y = H - 156 - h;
    PKM.GFX.panel(ctx, x, y, w, h);
    for (var j = 0; j < this.options.length; j++) {
      PKM.GFX.text(ctx, this.options[j], x + 40, y + 16 + j * 32, { size: 20, bold: j === this.idx, color: j === this.idx ? '#ffe080' : '#f0f0f0' });
      if (j === this.idx) PKM.GFX.cursor(ctx, x + 18, y + 20 + j * 32, '#ffe080');
    }
  };

  return {
    /* say('key or literal text', cb) - resolves dialogue.js keys, splits pages */
    say: function (textOrKey, cb) {
      PKM.Scenes.push(new DialogScene(resolve(textOrKey), cb));
    },
    ask: function (prompt, options, cb, opts) {
      var pages = prompt ? resolve(prompt) : [null];
      var last = pages.pop();
      var open = function () { PKM.Scenes.push(new ChoiceScene(last, options, cb, opts)); };
      if (pages.length) PKM.Scenes.push(new DialogScene(pages, open));
      else open();
    },
    interp: interp
  };
})();
