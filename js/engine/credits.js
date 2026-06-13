/* End credits: a scrolling roll after becoming Champion, then Hall of Fame +
   return to the overworld (healed & saved) with the post-game unlocked. */
PKM.Credits = (function () {
  var W = 960, H = 640;

  var LINES = [
    '', '', '',
    '~ POKEMON PLATINUM ~', 'A Fan Remake', '', '',
    'CHAMPION', '{PLAYER}', '', '',
    'A tale of Sinnoh,', 'of space and time,', 'and a world worth keeping whole.', '', '',
    'STARTER REGIONS', 'Kanto - Johto - Hoenn', 'Sinnoh - Unova - Kalos', 'Alola - Galar - Paldea', '', '',
    'ALL 1,025 SPECIES', 'walk these routes.', '', '',
    'NO HMs REQUIRED', 'Badges and gear opened every road.', '', '',
    'GYM LEADERS', 'Roark - Gardenia - Fantina - Maylene', 'Wake - Byron - Candice - Volkner', '', '',
    'ELITE FOUR', 'Aaron - Bertha - Flint - Lucian', '', '',
    'CHAMPION', 'Cynthia', '', '',
    'Pokemon data courtesy of', 'the PokeAPI open dataset.', '', '',
    'Built from scratch in', 'vanilla JavaScript.', '', '', '',
    'THE END', '', '',
    'Your adventure continues...', '(Sendoff Spring and the Hall of', 'Legends now await beyond the Fight Area.)',
    '', '', '', ''
  ];

  function Scene(done) { this.y = H; this.done = done; this.t = 0; this.fin = false; }
  Scene.prototype.update = function (dt) {
    this.t += dt;
    this.y -= dt * (PKM.Input.held('a') ? 140 : 46);
    var total = LINES.length * 40;
    if (this.y < -total) {
      if (!this.fin) {
        this.fin = true;
        PKM.State.healParty();
        PKM.State.setFlag('game_complete');
        PKM.Save.save();
      }
      if (PKM.Input.take('a') || PKM.Input.take('b') || this.t > LINES.length * 40 / 46 + 6) {
        PKM.Scenes.pop(this);
        var d = this.done; if (d) d();
      }
    }
  };
  Scene.prototype.draw = function (ctx) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0a0c1a'); g.addColorStop(1, '#1a1c38');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (var i = 0; i < LINES.length; i++) {
      var ly = this.y + i * 40;
      if (ly < -20 || ly > H + 20) continue;
      var line = PKM.Dialog.interp(LINES[i]);
      var big = /^[~A-Z0-9 ]+$/.test(line) && line.length < 26 && line.indexOf('-') < 0 && line === line.toUpperCase() && line.trim().length > 0;
      PKM.GFX.text(ctx, line, W / 2, ly, { size: big ? 26 : 18, bold: big, align: 'center', color: big ? '#ffe080' : '#dfe4f4' });
    }
    if (this.fin)
      PKM.GFX.text(ctx, '- Press Z -', W / 2, H - 40, { size: 15, align: 'center', color: '#8890b0' });
  };

  return { run: function (done) { PKM.Audio.play('champion'); PKM.Scenes.push(new Scene(done)); } };
})();
