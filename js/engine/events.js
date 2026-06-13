/* Event scripting: SCRIPTS[id] = function (done, ctx) {...}
   Scripts may chain Dialog/Battle/etc; player input is locked while running. */
PKM.Events = (function () {
  var running = 0;

  function run(idOrFn, ctx, done) {
    var fn = typeof idOrFn === 'function' ? idOrFn : PKM.SCRIPTS[idOrFn];
    if (!fn) { if (done) done(); return; }
    running++;
    PKM.Overworld.lock();
    fn(function () {
      running--;
      PKM.Overworld.unlock();
      if (done) done();
    }, ctx || {});
  }

  function giveItem(itemId, n, done) {
    var def = PKM.itemDef(itemId);
    n = n || 1;
    PKM.State.addItem(itemId, n);
    PKM.Audio.sfx('confirm');
    var label = def.name + (n > 1 ? ' x' + n : '');
    PKM.Dialog.say('{PLAYER} obtained the ' + label + '!', done);
  }

  function giveMon(pokeId, level, opts, done) {
    var mon = PKM.Mon.make(pokeId, level, Object.assign({ ot: PKM.G.name, shiny: false }, opts || {}));
    var where = PKM.State.givePokemon(mon);
    PKM.Audio.sfx('catch');
    var msg = '{PLAYER} received ' + PKM.Mon.name(mon) + '!';
    if (where && where.indexOf('box') === 0) msg += ' It was sent to ' + where + '.';
    PKM.Dialog.say(msg, done);
    return mon;
  }

  /* walk an npc along a path: 'udlr' steps, 'w' = brief pause.
     Driven by the overworld update loop (works headless / background). */
  function moveNpc(npc, path, done) {
    npc.path = path.split('');
    npc.pathDone = done || null;
  }

  function trainerSpotted(npc, dist) {
    var ows = PKM.Overworld;
    ows.lock();
    npc.alert = true;
    PKM.Audio.sfx('encounter');
    var path = 'w';
    for (var i = 0; i < dist - 1; i++) path += npc.dir[0];
    moveNpc(npc, path, function () {
      npc.alert = false;
      ows.unlock();
      engageTrainer(npc);
    });
  }

  function engageTrainer(npc, done) {
    var tr = PKM.DATA.trainers[npc.trainer];
    if (!tr) { if (done) done(); return; }
    var start = function () {
      PKM.Battle.start({
        kind: 'trainer', trainerId: npc.trainer, env: PKM.Overworld.battleEnv(),
        onWin: function () {
          PKM.State.setFlag('tr_' + npc.trainer);
          if (tr.winText) PKM.Dialog.say(tr.winText, done);
          else if (done) done();
        }
      });
    };
    if (tr.introText) PKM.Dialog.say(tr.introText, start);
    else start();
  }

  return {
    run: run, giveItem: giveItem, giveMon: giveMon, moveNpc: moveNpc,
    trainerSpotted: trainerSpotted, engageTrainer: engageTrainer,
    isRunning: function () { return running > 0; }
  };
})();

/* item definition with generated fallback for evolution items */
PKM.itemDef = function (id) {
  var d = PKM.DATA.items[id];
  if (d) return d;
  return { name: PKM.U.title(id), pocket: 'items', price: 2800, evo: 1, desc: 'Makes certain Pokemon evolve.' };
};
