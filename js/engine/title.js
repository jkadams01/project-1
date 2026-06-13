/* Title screen, new-game intro, and the all-generations starter picker. */
PKM.Title = (function () {
  var U = PKM.U, W = 960, H = 640;

  function TitleScene() { this.t = 0; this.idx = 0; this.hasSave = PKM.Save.exists(); }
  TitleScene.prototype.update = function (dt) {
    this.t += dt;
    var opts = this.options();
    var d = PKM.Input.menuDir();
    if (d === 'up' || d === 'down') { this.idx = (this.idx + 1) % opts.length; PKM.Audio.sfx('select'); }
    if (PKM.Input.take('a') || PKM.Input.take('start')) {
      PKM.Audio.sfx('confirm');
      var sel = opts[this.idx];
      if (sel === 'CONTINUE') {
        var G = PKM.Save.load();
        if (G) {
          PKM.Scenes.replaceAll(PKM.Overworld);
          PKM.Overworld.loadMap(G.map, G.x, G.y, G.dir || 'down');
          return;
        }
      }
      if (sel === 'NEW GAME') PKM.Scenes.replaceAll(new IntroScene());
      if (sel === 'DELETE SAVE') {
        var self = this;
        PKM.Dialog.ask('Really delete your saved game? This cannot be undone.', ['Keep save', 'DELETE'], function (i) {
          if (i === 1) { PKM.Save.wipe(); self.hasSave = false; self.idx = 0; }
        });
      }
    }
  };
  TitleScene.prototype.options = function () {
    return this.hasSave ? ['CONTINUE', 'NEW GAME', 'DELETE SAVE'] : ['NEW GAME'];
  };
  TitleScene.prototype.draw = function (ctx) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1a2a58'); g.addColorStop(.6, '#3a4a8a'); g.addColorStop(1, '#6a5a9a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // distortion swirls
    for (var i = 0; i < 7; i++) {
      ctx.strokeStyle = 'rgba(150,130,220,' + (0.10 + 0.05 * Math.sin(this.t + i)) + ')';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(W / 2, 240, 60 + i * 38 + Math.sin(this.t * .8 + i * 2) * 8, this.t * .2 + i, this.t * .2 + i + 4.5);
      ctx.stroke();
    }
    PKM.GFX.text(ctx, 'POKEMON', W / 2, 120, { size: 72, bold: true, align: 'center', color: '#ffd040', shadowColor: '#403010' });
    PKM.GFX.text(ctx, '~ PLATINUM REMAKE ~', W / 2, 210, { size: 30, bold: true, align: 'center', color: '#e8e8f8' });
    PKM.GFX.text(ctx, 'Gens 1-9 · No HMs · A fan-built tribute', W / 2, 258, { size: 17, align: 'center', color: '#b8c0e0' });
    PKM.Sprites.draw(ctx, 10007, 'front', W / 2 - 130, 280, 260); // Origin Giratina
    var opts = this.options();
    for (var o = 0; o < opts.length; o++) {
      var sel = o === this.idx;
      PKM.GFX.text(ctx, opts[o], W / 2, 555 + o * 30, { size: 21, bold: sel, align: 'center', color: sel ? '#ffe080' : '#c8c8d8' });
    }
    if (Math.floor(this.t * 1.4) % 2 === 0)
      PKM.GFX.text(ctx, '- Press Z / Enter -', W / 2, 520, { size: 16, align: 'center', color: '#a8b0d0' });
    PKM.GFX.text(ctx, 'Arrows: move · Z: confirm · X: cancel · Enter: menu · M: sound · `: speed-up', W / 2, H - 26, { size: 13, align: 'center', color: '#8890b0' });
  };

  /* ------------------------------ intro / naming ------------------------------ */
  function IntroScene() {
    this.stage = 0; this.t = 0;
    this.gender = 'm'; this.name = '';
    this.keyHandler = null;
    PKM.Audio.play('title');
  }
  IntroScene.prototype.update = function (dt) {
    this.t += dt;
    var self = this;
    if (this.stage === 0 && this.t > .5) {
      this.stage = 1;
      PKM.Dialog.say(['Welcome! My name is Rowan. People call me the Pokemon Professor.',
        'This world is inhabited by creatures we call Pokemon. From nine far-flung regions, over a thousand kinds have been seen in Sinnoh of late.',
        'We live together with Pokemon - as friends, as partners. Some of us battle alongside them. And some, like me, study them.',
        'But enough of my rambling. Tell me about yourself.'], function () { self.stage = 2; });
    } else if (this.stage === 2) {
      this.stage = 3;
      PKM.Dialog.ask('Are you a boy? Or a girl?', ['Boy', 'Girl'], function (i) {
        self.gender = i === 1 ? 'f' : 'm';
        self.stage = 4;
      }, { cancel: false });
    } else if (this.stage === 4) {
      this.stage = 5; // name entry via real keyboard
    } else if (this.stage === 5) {
      if (!this.keyHandler) {
        this.keyHandler = function (e) {
          if (e.key === 'Enter') {
            if (!self.name) self.name = self.gender === 'f' ? 'DAWN' : 'LUCAS';
            window.removeEventListener('keydown', self.keyHandler);
            self.keyHandler = 'done';
            self.stage = 6;
            return;
          }
          if (e.key === 'Backspace') { self.name = self.name.slice(0, -1); e.preventDefault(); return; }
          if (/^[a-zA-Z0-9]$/.test(e.key) && self.name.length < 10) self.name += e.key.toUpperCase();
        };
        window.addEventListener('keydown', this.keyHandler);
      }
    } else if (this.stage === 6) {
      this.stage = 7;
      PKM.Input.clear();
      PKM.Dialog.say(['' + this.name + '! A fine name.',
        'Your closest friend is a restless one - always darting off somewhere. I expect he\'ll come crashing into your life shortly.',
        'Your story is about to unfold. A tale of badges, of a team that toys with space and time, and of friends found in tall grass.',
        'Let\'s go, ' + this.name + ' - to the world of Pokemon!'], function () {
        PKM.Save.newGame(self.name, self.gender);
        PKM.State.setFlag('intro_done');
        PKM.Scenes.replaceAll(PKM.Overworld);
        PKM.Overworld.loadMap('twinleaf_home_2f', 5, 4, 'down');
        PKM.Events.run('wake_up');
      });
    }
  };
  IntroScene.prototype.draw = function (ctx) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#283848'); g.addColorStop(1, '#101820');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    PKM.GFX.drawActor(ctx, 'prof', 'down', 0, W / 2 - 16, 140);
    ctx.save(); ctx.translate(W / 2 - 64, 220); ctx.scale(4, 4); ctx.restore();
    if (this.stage === 5) {
      PKM.GFX.panel(ctx, W / 2 - 280, 260, 560, 150);
      PKM.GFX.text(ctx, 'Type your name, then press Enter:', W / 2, 285, { size: 18, align: 'center' });
      PKM.GFX.text(ctx, this.name + (Math.floor(this.t * 2) % 2 ? '_' : ''), W / 2, 330, { size: 32, bold: true, align: 'center', color: '#ffe080' });
      PKM.GFX.text(ctx, '(Enter with no name = ' + (this.gender === 'f' ? 'DAWN' : 'LUCAS') + ')', W / 2, 376, { size: 14, align: 'center', color: '#98a0b8' });
    }
  };

  /* ------------------------------ starter picker ------------------------------ */
  var REGIONS = [
    ['KANTO', 1, 4, 7], ['JOHTO', 152, 155, 158], ['HOENN', 252, 255, 258],
    ['SINNOH', 387, 390, 393], ['UNOVA', 495, 498, 501], ['KALOS', 650, 653, 656],
    ['ALOLA', 722, 725, 728], ['GALAR', 810, 813, 816], ['PALDEA', 906, 909, 912]
  ];
  function StarterScene(cb) {
    this.cb = cb; this.region = 3; this.slot = 1; this.t = 0; // default: Sinnoh, middle
    REGIONS.forEach(function (r) { PKM.Sprites.preload(r[1]); PKM.Sprites.preload(r[2]); PKM.Sprites.preload(r[3]); });
  }
  StarterScene.prototype.update = function (dt) {
    this.t += dt;
    var d = PKM.Input.menuDir();
    if (d === 'up') { this.region = (this.region + REGIONS.length - 1) % REGIONS.length; PKM.Audio.sfx('select'); }
    if (d === 'down') { this.region = (this.region + 1) % REGIONS.length; PKM.Audio.sfx('select'); }
    if (d === 'left') { this.slot = (this.slot + 2) % 3; PKM.Audio.sfx('select'); }
    if (d === 'right') { this.slot = (this.slot + 1) % 3; PKM.Audio.sfx('select'); }
    if (PKM.Input.take('a')) {
      var self = this;
      var id = REGIONS[this.region][this.slot + 1];
      var sp = PKM.species(id);
      PKM.Audio.sfx('confirm');
      PKM.Dialog.ask('So you want ' + sp.name + ', the ' + (sp.genus || sp.types[0] + ' Pokemon') + '?', ['Yes!', 'Not sure yet'], function (i) {
        if (i === 0) {
          PKM.Scenes.pop(self);
          self.cb(id);
        }
      });
    }
  };
  StarterScene.prototype.draw = function (ctx) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#6a4a28'); g.addColorStop(1, '#3a2814');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    PKM.GFX.text(ctx, 'The briefcase is packed with starter Pokemon from every known region!', W / 2, 26, { size: 18, align: 'center', color: '#ffe8c0' });
    // region list
    for (var r = 0; r < REGIONS.length; r++) {
      var sel = r === this.region;
      PKM.GFX.text(ctx, REGIONS[r][0], 60, 80 + r * 52, { size: 20, bold: sel, color: sel ? '#ffe080' : '#c0a888' });
      if (sel) PKM.GFX.cursor(ctx, 32, 84 + r * 52, '#ffe080');
    }
    // three starters
    var reg = REGIONS[this.region];
    for (var s = 0; s < 3; s++) {
      var id = reg[s + 1], sp = PKM.species(id);
      var x = 270 + s * 230, sel2 = s === this.slot;
      if (sel2) {
        ctx.fillStyle = 'rgba(255,224,128,.16)';
        ctx.fillRect(x - 10, 90, 220, 360);
        ctx.strokeStyle = '#ffe080'; ctx.strokeRect(x - 9.5, 90.5, 219, 359);
      }
      PKM.Sprites.draw(ctx, id, 'front', x + 10, 110 + (sel2 ? Math.sin(this.t * 4) * 6 : 0), 180);
      PKM.GFX.text(ctx, sp.name, x + 100, 310, { size: 20, bold: true, align: 'center', color: sel2 ? '#ffe080' : '#f0e0d0' });
      sp.types.forEach(function (tp, i) { PKM.GFX.typeBadge(ctx, tp, x + 100 - (sp.types.length * 34) + i * 70, 340); });
      PKM.GFX.text(ctx, sp.genus || '', x + 100, 370, { size: 13, align: 'center', color: '#c8b098' });
      var names = ['HP', 'AT', 'DF', 'SA', 'SD', 'SP'];
      for (var st = 0; st < 6; st++)
        PKM.GFX.text(ctx, names[st] + ' ' + sp.stats[st], x + 30 + (st % 2) * 90, 400 + Math.floor(st / 2) * 22, { size: 13, color: '#e0d0c0' });
    }
    PKM.GFX.text(ctx, '▲▼: region   ◄ ►: Pokemon   Z: choose', W / 2, H - 60, { size: 16, align: 'center', color: '#d8c0a0' });
  };

  return {
    scene: function () { return new TitleScene(); },
    pickStarter: function (cb) { PKM.Scenes.push(new StarterScene(cb)); }
  };
})();
