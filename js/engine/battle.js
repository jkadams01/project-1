/* Turn-based battle scene (singles). */
PKM.Battle = (function () {
  var U = PKM.U, W = 960, H = 640;

  /* ---------------------------- move overrides ---------------------------- */
  var BADLY_POISON = { 'toxic': 1, 'poison-fang': 1, 'malignant-chain': 1 };
  var RECHARGE = { 'hyper-beam': 1, 'giga-impact': 1, 'blast-burn': 1, 'hydro-cannon': 1, 'frenzy-plant': 1, 'roar-of-time': 1, 'rock-wrecker': 1, 'prismatic-laser': 1, 'meteor-assault': 1, 'eternabeam': 1 };
  var TWO_TURN = { 'fly': 'flew up high', 'dig': 'burrowed underground', 'dive': 'dove underwater', 'bounce': 'sprang up', 'phantom-force': 'vanished', 'shadow-force': 'vanished', 'solar-beam': 'is absorbing light', 'razor-wind': 'whipped up a whirlwind', 'sky-attack': 'is glowing', 'solar-blade': 'is absorbing light' };
  var WEATHER_MOVE = { 'rain-dance': 'rain', 'sunny-day': 'sun', 'sandstorm': 'sand', 'hail': 'hail', 'snowscape': 'hail', 'chilly-reception': 'hail' };
  var FIXED = { 'seismic-toss': 'level', 'night-shade': 'level', 'dragon-rage': 40, 'sonic-boom': 20 };
  var SELF_KO = { 'self-destruct': 1, 'explosion': 1, 'misty-explosion': 1 };
  var SCREEN = { 'light-screen': 'spec', 'reflect': 'phys', 'aurora-veil': 'both' };
  var HAZARD = { 'stealth-rock': 'rocks', 'spikes': 'spikes', 'toxic-spikes': 'tspikes', 'stone-axe': 'rocks', 'ceaseless-edge': 'spikes' };
  var PROTECT = { 'protect': 1, 'detect': 1, 'spiky-shield': 1, 'baneful-bunker': 1, 'silk-trap': 1, 'burning-bulwark': 1 };
  var PIVOT = { 'u-turn': 1, 'volt-switch': 1, 'flip-turn': 1, 'parting-shot': 1, 'teleport': 1 };
  var CONTACT_GUESS = 'physical';

  /* ------------------------------- battlers ------------------------------- */
  function newSide(mon) {
    return {
      mon: mon,
      stages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 },
      v: {}, // volatile: confuse, flinch, protect, protCount, recharge, twoTurn, leech, lastTaken, sashUsed, berryUsed, flashFire, slowStartT:5, truantSkip
      turnsOut: 0
    };
  }

  function stageMul(s) { return s >= 0 ? (2 + s) / 2 : 2 / (2 - s); }

  function effStat(side, key) {
    var idx = { atk: 1, def: 2, spa: 3, spd: 4, spe: 5 }[key];
    var v = PKM.Mon.stat(side.mon, idx) * stageMul(side.stages[key]);
    var ab = side.mon.ability, st = side.mon.status;
    if (key === 'spe') {
      if (st === 'par') v *= 0.5;
      if (ab === 'swift-swim' && weather === 'rain') v *= 2;
      if (ab === 'chlorophyll' && weather === 'sun') v *= 2;
      if (ab === 'sand-rush' && weather === 'sand') v *= 2;
      if (ab === 'slush-rush' && weather === 'hail') v *= 2;
      if (ab === 'quick-feet' && st) v *= 1.5;
      if (ab === 'slow-start' && side.v.slowStartT > 0) v *= 0.5;
    }
    if (key === 'atk') {
      if (ab === 'huge-power' || ab === 'pure-power') v *= 2;
      if (ab === 'hustle') v *= 1.5;
      if (ab === 'guts' && st) v *= 1.5;
      else if (st === 'brn') v *= 0.5;
      if (ab === 'slow-start' && side.v.slowStartT > 0) v *= 0.5;
    }
    if (key === 'spa' && ab === 'solar-power' && weather === 'sun') v *= 1.5;
    if (key === 'def' && ab === 'marvel-scale' && st) v *= 1.5;
    return Math.max(1, Math.floor(v));
  }

  var weather = '', weatherTurns = 0;

  /* =============================== scene =============================== */
  function Scene(opts) {
    this.opts = opts;
    this.kind = opts.kind;
    this.trainer = opts.trainerId ? PKM.DATA.trainers[opts.trainerId] : null;
    this.env = opts.env || {};
    weather = this.env.weather === 'rain' ? 'rain' : this.env.weather === 'snow' ? '' : '';
    weatherTurns = weather ? 999 : 0;
    this.q = [];
    this.phase = 'intro';
    this.menuIdx = 0; this.moveIdx = 0;
    this.t = 0; this.msg = null; this.msgChars = 0;
    this.turnCount = 0;
    this.participants = {};
    this.playerScreens = {}; this.enemyScreens = {};
    this.playerHazards = {}; this.enemyHazards = {};
    this.result = null;
    this.runAttempts = 0;
    this.anim = { pLunge: 0, eLunge: 0, pFlash: 0, eFlash: 0, pFaint: 0, eFaint: 0, shake: 0 };
    this.ballAnim = null;
    this.expAnim = null;

    var pidx = PKM.State.firstAlive();
    this.playerIdx = pidx;
    this.p = newSide(PKM.G.party[pidx]);
    if (this.trainer) {
      this.enemyParty = this.trainer.mons.map(function (m) {
        return PKM.Mon.make(m.id, m.level, { moves: m.moves, ability: m.ability, heldItem: m.item, shiny: false, ot: 'TRAINER', ivs: m.ivs || [20, 20, 20, 20, 20, 20] });
      });
      this.enemyIdx = 0;
      this.e = newSide(this.enemyParty[0]);
      PKM.Audio.play(this.trainer.music || 'battle');
    } else {
      this.e = newSide(opts.enemy);
      this.enemyParty = [opts.enemy];
      PKM.Audio.play(opts.music || 'battle');
    }
    PKM.State.markSeen(this.e.mon.pokeId);
    PKM.Sprites.preload(this.p.mon.pokeId); PKM.Sprites.preload(this.e.mon.pokeId);
    this.participants[pidx] = true;

    var intro = this.trainer
      ? (this.trainer.class ? this.trainer.class + ' ' : '') + this.trainer.name + ' wants to battle!'
      : 'A wild ' + PKM.Mon.name(this.e.mon) + ' appeared!';
    this.pushMsg(intro);
    this.q.push({ t: 'fn', f: this.onEntryAbilities.bind(this) });
    this.q.push({ t: 'msg', s: 'Go, ' + PKM.Mon.name(this.p.mon) + '!' , auto: .7 });
  }

  Scene.prototype.pushMsg = function (s, auto) { this.q.push({ t: 'msg', s: s, auto: auto }); };

  /* ------------------------- entry / switch effects ------------------------ */
  Scene.prototype.onEntryAbilities = function () {
    var self = this;
    [['e', this.e, this.p], ['p', this.p, this.e]].forEach(function (pair) {
      var side = pair[1], foe = pair[2], ab = side.mon.ability;
      if (ab === 'intimidate') {
        self.applyStages(foe, [['atk', -1]], PKM.Mon.name(side.mon) + '\'s Intimidate');
      }
      if (ab === 'sand-stream') { weather = 'sand'; weatherTurns = 8; self.pushMsg('A sandstorm brewed!', .8); }
      if (ab === 'drizzle') { weather = 'rain'; weatherTurns = 8; self.pushMsg('It started to rain!', .8); }
      if (ab === 'drought' || ab === 'orichalcum-pulse') { weather = 'sun'; weatherTurns = 8; self.pushMsg('The sunlight turned harsh!', .8); }
      if (ab === 'snow-warning') { weather = 'hail'; weatherTurns = 8; self.pushMsg('Snow began to fall!', .8); }
      if (ab === 'slow-start') side.v.slowStartT = 5;
      // hazards on switch-in handled in sendIn
    });
  };

  Scene.prototype.applyHazards = function (side, isPlayer) {
    var hz = isPlayer ? this.playerHazards : this.enemyHazards;
    var mon = side.mon, sp = PKM.species(mon.pokeId);
    if (hz.rocks) {
      var mult = PKM.typeMult('rock', sp.types);
      var dmg = Math.max(1, Math.floor(PKM.Mon.maxHp(mon) * mult / 8));
      if (mon.ability !== 'magic-guard') {
        mon.hp = Math.max(0, mon.hp - dmg);
        this.pushMsg('Pointed stones dug into ' + PKM.Mon.name(mon) + '!', .7);
      }
    }
    if (hz.spikes && sp.types.indexOf('flying') < 0 && mon.ability !== 'levitate' && mon.ability !== 'magic-guard') {
      mon.hp = Math.max(0, mon.hp - Math.max(1, Math.floor(PKM.Mon.maxHp(mon) / 8)));
      this.pushMsg(PKM.Mon.name(mon) + ' was hurt by spikes!', .7);
    }
    if (hz.tspikes && sp.types.indexOf('flying') < 0 && sp.types.indexOf('steel') < 0 && sp.types.indexOf('poison') < 0 && !mon.status) {
      mon.status = 'psn';
      this.pushMsg(PKM.Mon.name(mon) + ' was poisoned by toxic spikes!', .7);
    }
  };

  /* ------------------------------ stat stages ------------------------------ */
  Scene.prototype.applyStages = function (side, changes, sourceName) {
    var name = PKM.Mon.name(side.mon);
    for (var i = 0; i < changes.length; i++) {
      var key = ['hp', 'atk', 'def', 'spa', 'spd', 'spe', 'acc', 'eva'][changes[i][0]] || changes[i][0];
      if (key === 'hp') continue;
      var delta = changes[i][1];
      var cur = side.stages[key];
      var next = U.clamp(cur + delta, -6, 6);
      if (next === cur) { this.pushMsg(name + '\'s ' + statName(key) + ' won\'t go ' + (delta > 0 ? 'higher' : 'lower') + '!', .7); continue; }
      side.stages[key] = next;
      var words = Math.abs(delta) >= 2 ? (delta > 0 ? ' rose sharply!' : ' fell harshly!') : (delta > 0 ? ' rose!' : ' fell!');
      this.pushMsg((sourceName ? sourceName + ': ' : '') + name + '\'s ' + statName(key) + words, .7);
      // defiant / competitive
      if (delta < 0 && side.mon.ability === 'defiant') { side.stages.atk = U.clamp(side.stages.atk + 2, -6, 6); this.pushMsg(name + '\'s Defiant sharply raised its Attack!', .7); }
      if (delta < 0 && side.mon.ability === 'competitive') { side.stages.spa = U.clamp(side.stages.spa + 2, -6, 6); this.pushMsg(name + '\'s Competitive sharply raised its Sp. Atk!', .7); }
    }
  };
  function statName(k) {
    return { atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed', acc: 'accuracy', eva: 'evasiveness' }[k] || k;
  }

  /* -------------------------------- damage -------------------------------- */
  Scene.prototype.calcDamage = function (att, def, move, opts) {
    opts = opts || {};
    var sp = PKM.species(att.mon.pokeId), dsp = PKM.species(def.mon.pokeId);
    var power = move.power;
    if (!power) return { dmg: 0, mult: 1, crit: false };
    var ident = move.ident;
    if (FIXED[ident] !== undefined) {
      var fd = FIXED[ident] === 'level' ? att.mon.level : FIXED[ident];
      var m0 = PKM.typeMult(move.type, dsp.types);
      return { dmg: m0 === 0 ? 0 : fd, mult: m0 === 0 ? 0 : 1, crit: false, fixed: true };
    }
    if (ident === 'super-fang') return { dmg: Math.max(1, Math.floor(def.mon.hp / 2)), mult: 1, crit: false, fixed: true };
    if (ident === 'endeavor') return { dmg: Math.max(0, def.mon.hp - att.mon.hp), mult: 1, crit: false, fixed: true };
    if (ident === 'counter' || ident === 'mirror-coat' || ident === 'metal-burst' || ident === 'comeuppance')
      return { dmg: (att.v.lastTaken || 0) * 2, mult: 1, crit: false, fixed: true };

    // crit
    var critStage = (move.crit || 0) + (att.mon.ability === 'super-luck' ? 1 : 0);
    var critChance = critStage >= 2 ? 0.5 : critStage === 1 ? 0.125 : 1 / 24;
    var crit = !opts.noRandom && Math.random() < critChance;

    var phys = move.cls === 'physical';
    var A = effStat(att, phys ? 'atk' : 'spa');
    var D = effStat(def, phys ? 'def' : 'spd');
    if (crit) { // ignore unfavorable stages
      if (att.stages[phys ? 'atk' : 'spa'] < 0) A = PKM.Mon.stat(att.mon, phys ? 1 : 3);
      if (def.stages[phys ? 'def' : 'spd'] > 0) D = PKM.Mon.stat(def.mon, phys ? 2 : 4);
    }
    if (ident === 'body-press') A = effStat(att, 'def');
    if (ident === 'foul-play') A = effStat(def, 'atk');
    if (move.type === 'special' ) {}

    var mult = PKM.typeMult(move.type, dsp.types);
    // ability immunities / absorbs
    var dab = def.mon.ability;
    if (move.type === 'ground' && dab === 'levitate') mult = 0;
    if (move.type === 'fire' && dab === 'flash-fire') mult = 0;
    if (move.type === 'water' && (dab === 'water-absorb' || dab === 'dry-skin' || dab === 'storm-drain')) mult = 0;
    if (move.type === 'electric' && (dab === 'volt-absorb' || dab === 'lightning-rod' || dab === 'motor-drive')) mult = 0;
    if (move.type === 'grass' && dab === 'sap-sipper') mult = 0;
    if (dab === 'wonder-guard' && mult <= 1) mult = 0;
    if (mult === 0) return { dmg: 0, mult: 0, crit: false };
    if (dab === 'thick-fat' && (move.type === 'fire' || move.type === 'ice')) power *= 0.5;
    if (dab === 'heatproof' && move.type === 'fire') power *= 0.5;

    var ab = att.mon.ability;
    if (ab === 'technician' && power <= 60) power *= 1.5;
    if (ab === 'reckless' && (move.drain < 0)) power *= 1.2;
    if (ab === 'sheer-force' && (move.ailChance || move.statChance || move.flinch)) power *= 1.3;
    if (att.v.flashFire && move.type === 'fire') power *= 1.5;
    // pinch abilities
    var pinch = { overgrow: 'grass', blaze: 'fire', torrent: 'water', swarm: 'bug' }[ab];
    if (pinch === move.type && att.mon.hp <= PKM.Mon.maxHp(att.mon) / 3) power *= 1.5;
    // held items
    if (att.mon.heldItem === 'muscle-band' && phys) power *= 1.1;
    if (att.mon.heldItem === 'wise-glasses' && !phys) power *= 1.1;

    var L = att.mon.level;
    var base = Math.floor(Math.floor(Math.floor(2 * L / 5 + 2) * power * A / D) / 50) + 2;
    // weather
    if (weather === 'rain') { if (move.type === 'water') base *= 1.5; if (move.type === 'fire') base *= 0.5; }
    if (weather === 'sun') { if (move.type === 'fire') base *= 1.5; if (move.type === 'water') base *= 0.5; }
    // screens
    var screens = (def === this.p) ? this.playerScreens : this.enemyScreens;
    if (!crit && ((phys && (screens.phys || screens.both)) || (!phys && (screens.spec || screens.both)))) base *= 0.5;
    // stab
    var stab = sp.types.indexOf(move.type) >= 0 ? (ab === 'adaptability' ? 2 : 1.5) : 1;
    base *= stab * mult;
    if (crit) base *= ab === 'sniper' ? 2.25 : 1.5;
    if (!opts.noRandom) base *= (85 + U.ri(0, 15)) / 100;
    if (att.mon.status === 'brn' && phys && ab !== 'guts' && ident !== 'facade') base *= 0.5;
    if (ident === 'facade' && att.mon.status) base *= 2;
    return { dmg: Math.max(1, Math.floor(base)), mult: mult, crit: crit };
  };

  /* ----------------------------- turn execution ---------------------------- */
  Scene.prototype.chooseEnemyMove = function () {
    var e = this.e, p = this.p;
    var moves = e.mon.moves.filter(function (m) { return m.pp > 0; });
    if (!moves.length) return { struggle: true };
    var ai = this.trainer && this.trainer.ai !== 'basic';
    if (!ai) return U.pick(moves);
    var self = this;
    var scored = moves.map(function (ms) {
      var mv = PKM.move(ms.id), score = 1;
      if (mv.power) {
        var est = self.calcDamage(e, p, mv, { noRandom: true });
        score = est.dmg * (mv.acc ? mv.acc / 100 : 1);
        if (est.dmg >= p.mon.hp) score *= 2.5;
      } else {
        score = p.mon.hp > PKM.Mon.maxHp(p.mon) * .7 ? 18 + U.ri(0, 14) : 6;
        if (mv.heal && e.mon.hp < PKM.Mon.maxHp(e.mon) * .45) score = 60;
        if (mv.ailment && p.mon.status) score = 1;
      }
      return [ms, Math.max(1, score)];
    });
    scored.sort(function (a, b) { return b[1] - a[1]; });
    return (Math.random() < 0.85 ? scored[0] : U.pick(scored))[0];
  };

  Scene.prototype.execTurn = function (playerAction) {
    var self = this;
    this.turnCount++;
    var pMove = playerAction.type === 'move' ? PKM.move(playerAction.move.id) : null;
    var eChoice = this.chooseEnemyMove();
    var eMove = eChoice.struggle ? PKM.move('struggle') : PKM.move(eChoice.id);

    var actions = [];
    if (playerAction.type === 'move')
      actions.push({ side: this.p, foe: this.e, move: pMove, slot: playerAction.move, isPlayer: true });
    else if (playerAction.type === 'switch')
      actions.push({ switchTo: playerAction.idx, isPlayer: true, priority: 99 });
    else if (playerAction.type === 'item')
      actions.push({ item: playerAction.item, target: playerAction.target, isPlayer: true, priority: 99 });
    actions.push({ side: this.e, foe: this.p, move: eMove, slot: eChoice.struggle ? null : eChoice, isPlayer: false });

    actions.sort(function (a, b) {
      var pa = a.priority !== undefined ? a.priority : (a.move ? a.move.prio : 0);
      var pb = b.priority !== undefined ? b.priority : (b.move ? b.move.prio : 0);
      if (pa !== pb) return pb - pa;
      var sa = a.side ? effStat(a.side, 'spe') : 9999, sb = b.side ? effStat(b.side, 'spe') : 9999;
      if (a.side && a.side.mon.heldItem === 'quick-claw' && Math.random() < .2) sa += 10000;
      if (b.side && b.side.mon.heldItem === 'quick-claw' && Math.random() < .2) sb += 10000;
      if (sa !== sb) return sb - sa;
      return Math.random() < .5 ? -1 : 1;
    });

    this.pTookMove = playerAction.type === 'move';
    this.pChoseDamaging = pMove && pMove.power > 0;

    actions.forEach(function (a) {
      self.q.push({ t: 'fn', f: function () { self.execAction(a); } });
    });
    this.q.push({ t: 'fn', f: function () { self.endOfTurn(); } });
  };

  Scene.prototype.execAction = function (a) {
    var self = this;
    if (this.result) return;
    if (a.switchTo !== undefined) { this.doSwitch(a.switchTo); return; }
    if (a.item) { this.useItemAction(a); return; }

    var side = a.side, foe = a.foe, mon = side.mon, move = a.move;
    if (mon.hp <= 0) return;
    var name = (a.isPlayer ? '' : 'The foe\'s ') + PKM.Mon.name(mon);

    // pre-move status checks
    if (side.v.recharge) { side.v.recharge = false; this.pushMsg(name + ' must recharge!', .8); return; }
    if (mon.ability === 'truant') {
      side.v.truantSkip = !side.v.truantSkip;
      if (!side.v.truantSkip === false && side.v.truantSkip === true && side.turnsOut % 1 === 0 && side.v.loafed) { }
      if (side.v.loafed) { side.v.loafed = false; this.pushMsg(name + ' is loafing around!', .8); return; }
      side.v.loafed = true;
    }
    if (mon.status === 'slp') {
      mon.sleepTurns--;
      if (mon.sleepTurns <= 0) { mon.status = ''; this.pushMsg(name + ' woke up!', .8); }
      else { this.pushMsg(name + ' is fast asleep.', .8); return; }
    }
    if (mon.status === 'frz') {
      if (U.chance(20) || (move && move.type === 'fire')) { mon.status = ''; this.pushMsg(name + ' thawed out!', .8); }
      else { this.pushMsg(name + ' is frozen solid!', .8); return; }
    }
    if (side.v.flinch) { side.v.flinch = false; if (mon.ability !== 'inner-focus') { this.pushMsg(name + ' flinched!', .8); return; } }
    if (mon.status === 'par' && U.chance(25)) { this.pushMsg(name + ' is paralyzed! It can\'t move!', .8); return; }
    if (side.v.confuse > 0) {
      side.v.confuse--;
      if (side.v.confuse === 0) this.pushMsg(name + ' snapped out of confusion!', .8);
      else {
        this.pushMsg(name + ' is confused!', .8);
        if (U.chance(33)) {
          var sdmg = Math.max(1, Math.floor(((2 * mon.level / 5 + 2) * 40 * effStat(side, 'atk') / effStat(side, 'def')) / 50) + 2);
          mon.hp = Math.max(0, mon.hp - sdmg);
          this.pushMsg('It hurt itself in its confusion!', .8);
          this.afterDamage(side, a.isPlayer);
          return;
        }
      }
    }

    if (!move) return;
    // two-turn move continuation/start
    var ident = move.ident;
    if (TWO_TURN[ident] && !side.v.twoTurn) {
      if (!(ident === 'solar-beam' && weather === 'sun')) {
        side.v.twoTurn = ident;
        side.v.invuln = ['fly', 'dig', 'dive', 'bounce', 'phantom-force', 'shadow-force'].indexOf(ident) >= 0;
        this.pushMsg(name + ' ' + TWO_TURN[ident] + '!', .8);
        return;
      }
    }
    if (side.v.twoTurn) { side.v.twoTurn = null; side.v.invuln = false; }

    if (a.slot) a.slot.pp = Math.max(0, a.slot.pp - 1);
    this.pushMsg(name + ' used ' + move.name + '!');

    // protect
    if (PROTECT[ident]) {
      var fail = side.v.protCount > 0 && Math.random() < 1 - Math.pow(1 / 3, side.v.protCount);
      if (fail) { this.pushMsg('But it failed!', .8); side.v.protCount = 0; }
      else { side.v.protect = true; side.v.protCount = (side.v.protCount || 0) + 1; this.pushMsg(name + ' protected itself!', .8); }
      return;
    }
    side.v.protCount = 0;

    // target protected?
    var targetsFoe = move.power > 0 || (move.cat === 1 || move.cat === 4 || move.cat === 5 || move.cat === 6 || move.cat === 9 || move.cat === 11) ||
      (move.cat === 2 && move.statChanges.length && move.statChanges[0][1] < 0);
    if (foe.v.protect && targetsFoe) { this.pushMsg(PKM.Mon.name(foe.mon) + ' protected itself!', .8); return; }
    if (foe.v.invuln && move.power > 0) { this.pushMsg('It missed!', .8); return; }

    // sucker punch
    if (ident === 'sucker-punch' || ident === 'thunderclap') {
      var foeAttacking = a.isPlayer ? true : this.pChoseDamaging; // approx for player side
      if (a.isPlayer && !this.eChoseDamaging) {} // not tracked; allow
      if (!a.isPlayer && !this.pChoseDamaging) { this.pushMsg('But it failed!', .8); return; }
    }

    // accuracy
    var acc = move.acc;
    if (move.cat === 9) { // OHKO
      if (foe.mon.level > mon.level) { this.pushMsg('It failed to land!', .8); return; }
      acc = 30 + (mon.level - foe.mon.level);
    }
    if (acc && mon.ability !== 'no-guard' && foe.mon.ability !== 'no-guard') {
      var mulAcc = stageMul3(side.stages.acc - foe.stages.eva);
      if (mon.ability === 'compound-eyes') mulAcc *= 1.3;
      if (mon.ability === 'hustle' && move.cls === 'physical') mulAcc *= 0.8;
      if (foe.mon.ability === 'sand-veil' && weather === 'sand') mulAcc *= 0.8;
      if (foe.mon.ability === 'snow-cloak' && weather === 'hail') mulAcc *= 0.8;
      if (!U.chance(acc * mulAcc)) {
        this.pushMsg(a.isPlayer ? PKM.Mon.name(mon) + '\'s attack missed!' : 'The foe\'s attack missed!', .8);
        return;
      }
    }

    // ----- damaging -----
    if (move.power > 0 || move.cat === 9) {
      var hits = move.hitsMin ? U.ri(move.hitsMin, move.hitsMax || move.hitsMin) : 1;
      if (move.hitsMin === 2 && move.hitsMax === 5) hits = U.pickW([[2, 35], [3, 35], [4, 15], [5, 15]]);
      var totalDealt = 0, lastMult = 1, anyCrit = false;
      for (var h = 0; h < hits && foe.mon.hp > 0; h++) {
        var r = move.cat === 9 ? { dmg: foe.mon.hp, mult: 1, crit: false } : this.calcDamage(side, foe, move);
        lastMult = r.mult; anyCrit = r.crit;
        if (r.mult === 0) {
          var dab = foe.mon.ability, fname = PKM.Mon.name(foe.mon);
          if (move.type === 'fire' && dab === 'flash-fire') { foe.v.flashFire = true; this.pushMsg(fname + '\'s Flash Fire raised its fire power!', .8); }
          else if ((move.type === 'water' && (dab === 'water-absorb' || dab === 'dry-skin')) || (move.type === 'electric' && dab === 'volt-absorb')) {
            foe.mon.hp = Math.min(PKM.Mon.maxHp(foe.mon), foe.mon.hp + Math.floor(PKM.Mon.maxHp(foe.mon) / 4));
            this.pushMsg(fname + ' absorbed the attack!', .8);
          }
          else if (move.type === 'grass' && dab === 'sap-sipper') { this.applyStages(foe, [['atk', 1]], fname + '\'s Sap Sipper'); }
          else if (move.type === 'electric' && (dab === 'lightning-rod' || dab === 'motor-drive')) { this.applyStages(foe, [[dab === 'lightning-rod' ? 'spa' : 'spe', 1]], fname + '\'s ability'); }
          else this.pushMsg('It doesn\'t affect ' + fname + '...', .8);
          break;
        }
        var dmg = r.dmg;
        // sturdy / sash / false swipe
        if (dmg >= foe.mon.hp) {
          if (ident === 'false-swipe' || ident === 'hold-back') dmg = foe.mon.hp - 1;
          else if (foe.mon.ability === 'sturdy' && foe.mon.hp === PKM.Mon.maxHp(foe.mon)) { dmg = foe.mon.hp - 1; this.pushMsg(PKM.Mon.name(foe.mon) + ' endured the hit with Sturdy!', .8); }
          else if (foe.mon.heldItem === 'focus-sash' && foe.mon.hp === PKM.Mon.maxHp(foe.mon) && !foe.v.sashUsed) { dmg = foe.mon.hp - 1; foe.v.sashUsed = true; this.pushMsg(PKM.Mon.name(foe.mon) + ' hung on with its Focus Sash!', .8); }
        }
        if ((foe.mon.ability === 'multiscale' || foe.mon.ability === 'shadow-shield') && foe.mon.hp === PKM.Mon.maxHp(foe.mon)) dmg = Math.floor(dmg / 2);
        foe.mon.hp = Math.max(0, foe.mon.hp - dmg);
        foe.v.lastTaken = dmg;
        totalDealt += dmg;
        this.q.push({ t: 'hitAnim', target: a.isPlayer ? 'e' : 'p', mult: r.mult });
      }
      if (lastMult > 0) {
        if (hits > 1) this.pushMsg('Hit ' + hits + ' time(s)!', .7);
        if (anyCrit) this.pushMsg('A critical hit!', .7);
        if (lastMult > 1) this.pushMsg('It\'s super effective!', .7);
        if (lastMult < 1) this.pushMsg('It\'s not very effective...', .7);
        if (move.cat === 9 && foe.mon.hp <= 0) this.pushMsg('It\'s a one-hit KO!', .7);

        // drain / recoil
        if (move.drain > 0) {
          mon.hp = Math.min(PKM.Mon.maxHp(mon), mon.hp + Math.max(1, Math.floor(totalDealt * move.drain / 100)));
          this.pushMsg(PKM.Mon.name(foe.mon) + ' had its energy drained!', .7);
        }
        if (move.drain < 0 && mon.ability !== 'rock-head' && mon.ability !== 'magic-guard') {
          mon.hp = Math.max(0, mon.hp + Math.floor(totalDealt * move.drain / 100));
          this.pushMsg(name + ' was hurt by recoil!', .7);
        }
        if (SELF_KO[ident]) mon.hp = 0;
        if (ident === 'struggle') { mon.hp = Math.max(0, mon.hp - Math.floor(PKM.Mon.maxHp(mon) / 4)); this.pushMsg(name + ' was hurt by recoil!', .7); }
        if (ident === 'pay-day' && a.isPlayer) this.payday = (this.payday || 0) + mon.level * 5;

        // secondary effects
        var grace = mon.ability === 'serene-grace' ? 2 : 1;
        var shielded = foe.mon.ability === 'shield-dust';
        if (!shielded && move.ailment && foe.mon.hp > 0) {
          var ch = (move.ailChance || (move.cat === 4 ? 10 : 100)) * grace;
          if (U.chance(ch)) this.inflict(foe, move.ailment, ident, !a.isPlayer);
        }
        if (!shielded && move.flinch && foe.mon.hp > 0 && U.chance(move.flinch * grace)) foe.v.flinch = true;
        if (move.statChanges.length && U.chance((move.statChance || 100) * (move.cat === 6 ? grace : 1))) {
          var target = move.cat === 7 ? side : (move.cat === 6 ? foe : (move.statChanges[0][1] > 0 ? side : foe));
          if (!(target === foe && shielded && move.cat === 6))
            this.applyStages(target, move.statChanges.map(function (sc) { return [sc[0] - 1, sc[1]]; }));
        }
        // contact punish
        if (move.cls === CONTACT_GUESS && foe.mon.hp > 0 && totalDealt > 0) this.contactEffects(side, foe);
        if (RECHARGE[ident] && foe.mon.hp > 0) side.v.recharge = true;
        if (HAZARD[ident]) this.setHazard(a.isPlayer, HAZARD[ident]);
        if (PIVOT[ident] && a.isPlayer && this.alivePartyCount() > 1 && foe.mon.hp > 0) this.pendingPivot = true;
        if (foe.mon.ability === 'moxie' && foe.mon.hp <= 0) {} // foe fainted; moxie for attacker:
        if (mon.ability === 'moxie' && foe.mon.hp <= 0) this.applyStages(side, [['atk', 1]], 'Moxie');
        if (ident === 'rapid-spin') { var myHz = a.isPlayer ? this.playerHazards : this.enemyHazards; if (myHz.rocks || myHz.spikes || myHz.tspikes) { if (a.isPlayer) this.playerHazards = {}; else this.enemyHazards = {}; this.pushMsg(name + ' blew away the hazards!', .7); } }
      }
      this.afterDamage(foe, !a.isPlayer);
      return;
    }

    // ----- status moves -----
    this.execStatusMove(a, name);
  };

  Scene.prototype.execStatusMove = function (a, name) {
    var side = a.side, foe = a.foe, mon = side.mon, move = a.move, ident = move.ident;
    var foeName = PKM.Mon.name(foe.mon);

    if (WEATHER_MOVE[ident]) { weather = WEATHER_MOVE[ident]; weatherTurns = 8; this.pushMsg('The weather changed!', .8); return; }
    if (SCREEN[ident]) {
      var sc = a.isPlayer ? this.playerScreens : this.enemyScreens;
      sc[SCREEN[ident]] = 8;
      this.pushMsg(name + ' raised a protective veil!', .8); return;
    }
    if (HAZARD[ident]) { this.setHazard(a.isPlayer, HAZARD[ident]); this.pushMsg('Hazards scattered around the foe\'s side!', .8); return; }
    if (ident === 'haze') {
      [this.p, this.e].forEach(function (s) { for (var k in s.stages) s.stages[k] = 0; });
      this.pushMsg('All stat changes were erased!', .8); return;
    }
    if (ident === 'rest') {
      if (mon.hp >= PKM.Mon.maxHp(mon)) { this.pushMsg('But it failed!', .8); return; }
      mon.hp = PKM.Mon.maxHp(mon); mon.status = 'slp'; mon.sleepTurns = 2;
      this.pushMsg(name + ' slept and became healthy!', .8); return;
    }
    if (ident === 'whirlwind' || ident === 'roar') {
      if (!this.trainer && !a.isPlayer) { this.pushMsg('But it failed!', .8); return; }
      if (a.isPlayer && !this.trainer) { this.result = 'run'; this.pushMsg(foeName + ' was blown away!'); this.q.push({ t: 'end' }); return; }
      this.pushMsg('But it failed!', .8); return;
    }
    if (ident === 'leech-seed') {
      if (PKM.species(foe.mon.pokeId).types.indexOf('grass') >= 0) { this.pushMsg('It doesn\'t affect ' + foeName + '...', .8); return; }
      foe.v.leech = true; this.pushMsg(foeName + ' was seeded!', .8); return;
    }
    if (ident === 'pain-split') {
      var avg = Math.floor((mon.hp + foe.mon.hp) / 2);
      mon.hp = Math.min(PKM.Mon.maxHp(mon), avg); foe.mon.hp = Math.min(PKM.Mon.maxHp(foe.mon), Math.max(1, avg));
      this.pushMsg('The battlers shared their pain!', .8); return;
    }

    // heal moves
    if (move.heal > 0 || move.cat === 3) {
      var amt = Math.floor(PKM.Mon.maxHp(mon) * (move.heal || 50) / 100);
      if (ident === 'synthesis' || ident === 'morning-sun' || ident === 'moonlight')
        amt = Math.floor(PKM.Mon.maxHp(mon) * (weather === 'sun' ? 2 / 3 : weather ? 1 / 4 : 1 / 2));
      if (mon.hp >= PKM.Mon.maxHp(mon)) { this.pushMsg('Its HP is already full!', .8); return; }
      mon.hp = Math.min(PKM.Mon.maxHp(mon), mon.hp + amt);
      this.pushMsg(name + ' regained health!', .8); return;
    }

    // pure ailment
    if (move.cat === 1 || (move.ailment && !move.power)) {
      this.inflict(foe, move.ailment, ident, !a.isPlayer, true);
      return;
    }
    // stat changes
    if (move.statChanges.length) {
      var target = move.statChanges[0][1] > 0 && move.cat !== 6 ? side : foe;
      if (target === foe && foe.v.protect) { this.pushMsg(foeName + ' protected itself!', .8); return; }
      this.applyStages(target, move.statChanges.map(function (sc) { return [sc[0] - 1, sc[1]]; }));
      if (move.cat === 5 && move.ailment) this.inflict(foe, move.ailment, ident, !a.isPlayer); // swagger
      return;
    }
    this.pushMsg('But nothing happened!', .8);
  };

  Scene.prototype.inflict = function (side, ailmentId, sourceIdent, onPlayer, announceFail) {
    var mon = side.mon, name = PKM.Mon.name(mon);
    var sp = PKM.species(mon.pokeId), ab = mon.ability;
    var AIL = { 1: 'par', 2: 'slp', 3: 'frz', 4: 'brn', 5: 'psn', 6: 'confuse', 18: 'leech' };
    var kind = AIL[ailmentId];
    if (!kind) return;
    if (kind === 'confuse') {
      if (ab === 'own-tempo' || side.v.confuse) { if (announceFail) this.pushMsg('But it failed!', .8); return; }
      side.v.confuse = U.ri(2, 5);
      this.pushMsg(name + ' became confused!', .8); return;
    }
    if (kind === 'leech') { if (sp.types.indexOf('grass') < 0) { side.v.leech = true; this.pushMsg(name + ' was seeded!', .8); } return; }
    if (mon.status) { if (announceFail) this.pushMsg('But it failed!', .8); return; }
    if (kind === 'psn' && (sp.types.indexOf('poison') >= 0 || sp.types.indexOf('steel') >= 0 || ab === 'immunity')) { if (announceFail) this.pushMsg('It doesn\'t affect ' + name + '...', .8); return; }
    if (kind === 'brn' && (sp.types.indexOf('fire') >= 0 || ab === 'water-veil')) { if (announceFail) this.pushMsg('It doesn\'t affect ' + name + '...', .8); return; }
    if (kind === 'par' && (sp.types.indexOf('electric') >= 0 || ab === 'limber')) { if (announceFail) this.pushMsg('It doesn\'t affect ' + name + '...', .8); return; }
    if (kind === 'frz' && (sp.types.indexOf('ice') >= 0 || ab === 'magma-armor' || weather === 'sun')) { if (announceFail) this.pushMsg('It failed!', .8); return; }
    if (kind === 'slp' && (ab === 'insomnia' || ab === 'vital-spirit')) { if (announceFail) this.pushMsg(name + ' stayed awake!', .8); return; }
    mon.status = kind === 'psn' && BADLY_POISON[sourceIdent] ? 'tox' : kind;
    mon.toxN = 1;
    if (kind === 'slp') mon.sleepTurns = U.ri(1, 3);
    var words = { par: ' was paralyzed!', slp: ' fell asleep!', frz: ' was frozen solid!', brn: ' was burned!', psn: BADLY_POISON[sourceIdent] ? ' was badly poisoned!' : ' was poisoned!' };
    this.pushMsg(name + words[kind], .8);
    // synchronize
    var other = side === this.p ? this.e : this.p;
    if (other.mon.ability === 'synchronize' && (kind === 'par' || kind === 'psn' || kind === 'brn') && !other.mon.status) {
      // reflect back
      this.inflict(other === this.p ? this.p : this.e, ailmentId, sourceIdent, !onPlayer);
    }
    // lum berry
    if (mon.heldItem === 'lum-berry') { mon.status = ''; mon.heldItem = ''; this.pushMsg(name + '\'s Lum Berry cured it!', .8); }
  };

  Scene.prototype.contactEffects = function (att, def) {
    var dab = def.mon.ability, aname = PKM.Mon.name(att.mon);
    if (dab === 'static' && U.chance(30) && !att.mon.status) this.inflict(att, 1, '', att === this.p);
    if (dab === 'flame-body' && U.chance(30) && !att.mon.status) this.inflict(att, 4, '', att === this.p);
    if (dab === 'poison-point' && U.chance(30) && !att.mon.status) this.inflict(att, 5, '', att === this.p);
    if (dab === 'effect-spore' && U.chance(20) && !att.mon.status) this.inflict(att, U.pick([1, 2, 5]), '', att === this.p);
    if ((dab === 'rough-skin' || dab === 'iron-barbs') && att.mon.ability !== 'magic-guard') {
      att.mon.hp = Math.max(0, att.mon.hp - Math.max(1, Math.floor(PKM.Mon.maxHp(att.mon) / 8)));
      this.pushMsg(aname + ' was hurt by ' + PKM.Mon.name(def.mon) + '\'s ' + PKM.U.title(dab) + '!', .7);
    }
  };

  Scene.prototype.setHazard = function (byPlayer, kind) {
    var hz = byPlayer ? this.enemyHazards : this.playerHazards;
    hz[kind] = (hz[kind] || 0) + 1;
  };

  Scene.prototype.afterDamage = function (side, isPlayerSide) {
    var self = this;
    this.q.push({ t: 'fn', f: function () { self.checkFaints(); } });
  };

  /* ------------------------------ end of turn ------------------------------ */
  Scene.prototype.endOfTurn = function () {
    if (this.result) return;
    var self = this;
    if (weatherTurns > 0 && weatherTurns < 99) {
      weatherTurns--;
      if (weatherTurns === 0) { weather = ''; this.pushMsg('The weather returned to normal.', .7); }
    }
    [this.playerScreens, this.enemyScreens].forEach(function (sc) {
      for (var k in sc) { if (sc[k] > 0) { sc[k]--; } if (sc[k] === 0) delete sc[k]; }
    });
    [[this.p, true], [this.e, false]].forEach(function (pair) {
      var side = pair[0], mon = side.mon;
      if (mon.hp <= 0) return;
      var name = PKM.Mon.name(mon), max = PKM.Mon.maxHp(mon);
      side.v.protect = false;
      side.turnsOut++;
      if (side.v.slowStartT > 0) side.v.slowStartT--;
      // weather chip
      if (weather === 'sand' || weather === 'hail') {
        var sp = PKM.species(mon.pokeId);
        var immune = mon.ability === 'magic-guard' || mon.ability === 'sand-veil' && weather === 'sand' || mon.ability === 'ice-body' && weather === 'hail' || mon.ability === 'snow-cloak' && weather === 'hail' || mon.ability === 'sand-rush' && weather === 'sand' || mon.ability === 'sand-force' || mon.ability === 'overcoat';
        if (weather === 'sand') immune = immune || ['rock', 'ground', 'steel'].some(function (t) { return sp.types.indexOf(t) >= 0; });
        if (weather === 'hail') immune = immune || sp.types.indexOf('ice') >= 0;
        if (!immune) { mon.hp = Math.max(0, mon.hp - Math.max(1, Math.floor(max / 16))); self.pushMsg(name + ' is buffeted by the weather!', .6); }
      }
      if (mon.ability === 'ice-body' && weather === 'hail' || mon.ability === 'rain-dish' && weather === 'rain' || mon.ability === 'dry-skin' && weather === 'rain') {
        if (mon.hp < max) { mon.hp = Math.min(max, mon.hp + Math.floor(max / 16)); self.pushMsg(name + ' restored a little HP!', .6); }
      }
      if (mon.ability === 'dry-skin' && weather === 'sun' || mon.ability === 'solar-power' && weather === 'sun') {
        mon.hp = Math.max(0, mon.hp - Math.floor(max / 8));
      }
      if (mon.ability === 'speed-boost') self.applyStages(side, [['spe', 1]], 'Speed Boost');
      // status damage
      if (mon.ability !== 'magic-guard') {
        if (mon.status === 'brn') { mon.hp = Math.max(0, mon.hp - Math.max(1, Math.floor(max / 16))); self.pushMsg(name + ' is hurt by its burn!', .6); }
        if (mon.status === 'psn') {
          if (mon.ability === 'poison-heal') { mon.hp = Math.min(max, mon.hp + Math.floor(max / 8)); }
          else { mon.hp = Math.max(0, mon.hp - Math.max(1, Math.floor(max / 8))); self.pushMsg(name + ' is hurt by poison!', .6); }
        }
        if (mon.status === 'tox') {
          if (mon.ability === 'poison-heal') { mon.hp = Math.min(max, mon.hp + Math.floor(max / 8)); }
          else {
            mon.toxN = Math.min(15, (mon.toxN || 1));
            mon.hp = Math.max(0, mon.hp - Math.max(1, Math.floor(max * mon.toxN / 16)));
            mon.toxN++;
            self.pushMsg(name + ' is hurt by poison!', .6);
          }
        }
        if (side.v.leech) {
          var other = side === self.p ? self.e : self.p;
          if (other.mon.hp > 0) {
            var drained = Math.max(1, Math.floor(max / 8));
            mon.hp = Math.max(0, mon.hp - drained);
            other.mon.hp = Math.min(PKM.Mon.maxHp(other.mon), other.mon.hp + drained);
            self.pushMsg(name + '\'s health is sapped by Leech Seed!', .6);
          }
        }
      }
      // leftovers / berries
      if (mon.heldItem === 'leftovers' && mon.hp > 0 && mon.hp < max) mon.hp = Math.min(max, mon.hp + Math.max(1, Math.floor(max / 16)));
      if (mon.heldItem === 'oran-berry' && mon.hp > 0 && mon.hp <= max / 2) { mon.hp = Math.min(max, mon.hp + 10); mon.heldItem = ''; self.pushMsg(name + ' ate its Oran Berry!', .6); }
      if (mon.heldItem === 'sitrus-berry' && mon.hp > 0 && mon.hp <= max / 2) { mon.hp = Math.min(max, mon.hp + Math.floor(max / 4)); mon.heldItem = ''; self.pushMsg(name + ' ate its Sitrus Berry!', .6); }
    });
    this.q.push({ t: 'fn', f: function () { self.checkFaints(); self.maybePivot(); } });
  };

  Scene.prototype.maybePivot = function () {
    if (this.pendingPivot && !this.result && this.p.mon.hp > 0) {
      this.pendingPivot = false;
      this.phase = 'switchMenu'; this.forcedSwitch = false; this.pivotSwitch = true;
    }
  };

  /* -------------------------------- faints -------------------------------- */
  Scene.prototype.checkFaints = function () {
    var self = this;
    if (this.result) return;
    if (this.e.mon.hp <= 0 && !this.e.v.fainted) {
      this.e.v.fainted = true;
      this.q.push({ t: 'faintAnim', who: 'e' });
      this.pushMsg('The foe\'s ' + PKM.Mon.name(this.e.mon) + ' fainted!');
      this.q.push({ t: 'fn', f: function () { self.awardExp(); } });
      this.q.push({ t: 'fn', f: function () { self.enemyNext(); } });
    }
    if (this.p.mon.hp <= 0 && !this.p.v.fainted) {
      this.p.v.fainted = true;
      this.q.push({ t: 'faintAnim', who: 'p' });
      this.pushMsg(PKM.Mon.name(this.p.mon) + ' fainted!');
      this.q.push({ t: 'fn', f: function () { self.playerNext(); } });
    }
  };

  Scene.prototype.alivePartyCount = function () {
    return PKM.G.party.filter(function (m) { return m.hp > 0; }).length;
  };

  Scene.prototype.awardExp = function () {
    var self = this;
    var defeated = this.e.mon;
    var yieldExp = PKM.Mon.expYield(defeated, !!this.trainer);
    var parts = Object.keys(this.participants).map(Number).filter(function (i) {
      return PKM.G.party[i] && PKM.G.party[i].hp > 0;
    });
    if (!parts.length) return;
    var share = Math.max(1, Math.floor(yieldExp / parts.length));
    var all = PKM.State.hasItem('exp-charm');
    PKM.G.party.forEach(function (mon, idx) {
      if (mon.hp <= 0 || mon.level >= 100) return;
      var amt = parts.indexOf(idx) >= 0 ? share : (all ? Math.floor(yieldExp / 2) : 0);
      if (!amt) return;
      self.pushMsg(PKM.Mon.name(mon) + ' gained ' + amt + ' Exp. Points!', .8);
      self.q.push({ t: 'fn', f: function () { self.applyExp(mon, idx, amt); } });
    });
  };

  Scene.prototype.applyExp = function (mon, idx, amt) {
    var self = this;
    var events = PKM.Mon.gainExp(mon, amt);
    events.forEach(function (ev) {
      if (ev.type === 'level') {
        self.q.push({ t: 'fn', f: function () { PKM.Audio.sfx('levelup'); } });
        self.pushMsg(PKM.Mon.name(mon) + ' grew to Lv. ' + ev.level + '!');
      } else if (ev.type === 'move') {
        self.q.push({ t: 'learnMove', mon: mon, moveId: ev.moveId });
      } else if (ev.type === 'evolve') {
        self.pendingEvos = self.pendingEvos || [];
        if (!self.pendingEvos.some(function (p) { return p.mon === mon; }))
          self.pendingEvos.push({ mon: mon, edge: ev.edge });
      }
    });
  };

  Scene.prototype.enemyNext = function () {
    var self = this;
    if (!this.trainer) { this.finish('win'); return; }
    var next = -1;
    for (var i = 0; i < this.enemyParty.length; i++)
      if (this.enemyParty[i].hp > 0) { next = i; break; }
    if (next < 0) {
      var prize = (this.trainer.money || 40) * this.trainer.mons[this.trainer.mons.length - 1].level;
      PKM.State.addMoney(prize);
      this.pushMsg('{PLAYER} defeated ' + this.trainer.name + '!');
      if (this.trainer.loseText) this.pushMsg('"' + this.trainer.loseText + '"');
      this.pushMsg('{PLAYER} got ' + U.fmtMoney(prize) + ' for winning!');
      this.finish('win');
      return;
    }
    this.enemyIdx = next;
    this.e = newSide(this.enemyParty[next]);
    this.participants = {}; this.participants[this.playerIdx] = true;
    PKM.State.markSeen(this.e.mon.pokeId);
    PKM.Sprites.preload(this.e.mon.pokeId);
    this.pushMsg(this.trainer.name + ' sent out ' + PKM.Mon.name(this.e.mon) + '!', .9);
    this.q.push({ t: 'fn', f: function () { self.applyHazards(self.e, false); self.onSwitchInAbility(self.e); } });
  };

  Scene.prototype.playerNext = function () {
    if (this.alivePartyCount() === 0) {
      var lost = Math.min(PKM.G.money, 100 * (PKM.State.badgeCount() + 1) * 4);
      PKM.State.addMoney(-lost);
      this.pushMsg('{PLAYER} is out of usable Pokemon!');
      this.pushMsg('{PLAYER} blacked out and dropped ' + U.fmtMoney(lost) + '...');
      this.finish('lose');
      return;
    }
    this.phase = 'switchMenu';
    this.forcedSwitch = true;
  };

  Scene.prototype.doSwitch = function (idx) {
    var self = this;
    var old = this.p.mon;
    if (old.hp > 0) {
      if (old.ability === 'natural-cure') old.status = '';
      if (old.ability === 'regenerator') old.hp = Math.min(PKM.Mon.maxHp(old), old.hp + Math.floor(PKM.Mon.maxHp(old) / 3));
      this.pushMsg('Come back, ' + PKM.Mon.name(old) + '!', .6);
    }
    this.playerIdx = idx;
    this.p = newSide(PKM.G.party[idx]);
    this.participants[idx] = true;
    PKM.Sprites.preload(this.p.mon.pokeId);
    this.pushMsg('Go, ' + PKM.Mon.name(this.p.mon) + '!', .8);
    this.q.push({ t: 'fn', f: function () { self.applyHazards(self.p, true); self.onSwitchInAbility(self.p); self.checkFaints(); } });
  };

  Scene.prototype.onSwitchInAbility = function (side) {
    var foe = side === this.p ? this.e : this.p;
    var ab = side.mon.ability;
    if (ab === 'intimidate' && foe.mon.hp > 0) this.applyStages(foe, [['atk', -1]], PKM.Mon.name(side.mon) + '\'s Intimidate');
    if (ab === 'sand-stream' && weather !== 'sand') { weather = 'sand'; weatherTurns = 8; this.pushMsg('A sandstorm brewed!', .7); }
    if (ab === 'drizzle' && weather !== 'rain') { weather = 'rain'; weatherTurns = 8; this.pushMsg('It started to rain!', .7); }
    if (ab === 'drought' && weather !== 'sun') { weather = 'sun'; weatherTurns = 8; this.pushMsg('The sunlight turned harsh!', .7); }
    if (ab === 'snow-warning' && weather !== 'hail') { weather = 'hail'; weatherTurns = 8; this.pushMsg('Snow began to fall!', .7); }
    if (ab === 'slow-start') side.v.slowStartT = 5;
  };

  /* --------------------------------- items -------------------------------- */
  Scene.prototype.useItemAction = function (a) {
    var self = this, id = a.item, def = PKM.itemDef(id);
    PKM.State.takeItem(id, 1);
    if (def.ball) { this.throwBall(id, def); return; }
    var target = PKM.G.party[a.target !== undefined ? a.target : this.playerIdx];
    var name = PKM.Mon.name(target);
    if (def.heal) {
      var max = PKM.Mon.maxHp(target);
      target.hp = Math.min(max, target.hp + def.heal);
      if (def.cure === 'all') { target.status = ''; }
      this.pushMsg(name + '\'s HP was restored!', .8);
    } else if (def.cure) {
      if (def.cure === 'all') target.status = '';
      else if (target.status === def.cure || (def.cure === 'psn' && target.status === 'tox')) target.status = '';
      this.pushMsg(name + ' was cured!', .8);
    } else if (def.revive) {
      target.hp = Math.floor(PKM.Mon.maxHp(target) * def.revive);
      this.pushMsg(name + ' was revived!', .8);
    } else {
      this.pushMsg('It won\'t have any effect.', .8);
    }
    PKM.Audio.sfx('heal');
  };

  Scene.prototype.throwBall = function (id, def) {
    var self = this;
    if (this.trainer) { this.pushMsg('You can\'t catch another Trainer\'s Pokemon!', .9); return; }
    var mult = def.ball;
    if (def.quick && this.turnCount <= 1) mult = def.quick;
    if (def.dusk && (this.env.cave || !U.isDay())) mult = def.dusk;
    if (def.timer) mult = Math.min(4, 1 + this.turnCount * 0.3);
    if (def.net) {
      var ts = PKM.species(this.e.mon.pokeId).types;
      if (ts.indexOf('bug') >= 0 || ts.indexOf('water') >= 0) mult = def.net;
    }
    if (def.nest) mult = Math.max(1, (41 - this.e.mon.level) / 10);
    var shakes = PKM.Mon.catchRoll(this.e.mon, mult);
    this.pushMsg('{PLAYER} threw a ' + def.name + '!', .5);
    this.q.push({ t: 'ball', shakes: shakes });
    if (shakes >= 4) {
      var mon = this.e.mon;
      this.q.push({ t: 'fn', f: function () {
        PKM.Audio.sfx('catch');
        if (def.healOnCatch) PKM.Mon.heal(mon);
        var where = PKM.State.givePokemon(mon);
        self.pushMsg('Gotcha! ' + PKM.Mon.name(mon) + ' was caught!');
        if (where && where.indexOf('box') === 0) self.pushMsg('It was sent to ' + PKM.U.cap(where) + '.');
        self.pushMsg(PKM.Mon.name(mon) + '\'s data was added to the Pokedex.', .9);
        self.finish('catch');
      } });
    } else {
      var lines = ['Oh no! The Pokemon broke free!', 'Aww! It appeared to be caught!', 'Aargh! Almost had it!', 'Shoot! It was so close, too!'];
      this.pushMsg(lines[Math.min(3, shakes)], .9);
    }
  };

  /* --------------------------------- finish -------------------------------- */
  Scene.prototype.finish = function (result) {
    var self = this;
    this.result = result;
    if (this.payday) { PKM.State.addMoney(this.payday); this.pushMsg('{PLAYER} picked up ' + U.fmtMoney(this.payday) + '!'); }
    this.q.push({ t: 'end' });
  };

  Scene.prototype.endNow = function () {
    var self = this;
    PKM.Scenes.pop(this);
    weather = ''; weatherTurns = 0;
    var evos = this.pendingEvos || [];
    var runEvos = function () {
      if (!evos.length) {
        if (PKM.MAPS[PKM.Overworld.mapId] && PKM.MAPS[PKM.Overworld.mapId].music) PKM.Audio.play(PKM.MAPS[PKM.Overworld.mapId].music);
        if (self.result === 'lose') {
          PKM.State.healParty();
          var heal = PKM.G.lastHeal;
          PKM.Overworld.loadMap(heal.map, heal.x, heal.y, 'down');
        }
        if (self.opts.onWin && self.result === 'win') self.opts.onWin();
        if (self.opts.onLose && self.result === 'lose') self.opts.onLose();
        if (self.opts.onEnd) self.opts.onEnd(self.result);
        return;
      }
      var ev = evos.shift();
      var edge = PKM.Mon.checkEvolve(ev.mon, {});
      if (edge) PKM.Battle.startEvolution(ev.mon, edge, runEvos);
      else runEvos();
    };
    runEvos();
  };

  /* ----------------------------- update / draw ----------------------------- */
  Scene.prototype.update = function (dt) {
    if (PKM.fastMode) dt *= 1.8;
    this.t += dt;
    var a = this.anim;
    ['pLunge', 'eLunge', 'pFlash', 'eFlash', 'shake'].forEach(function (k) { if (a[k] > 0) a[k] = Math.max(0, a[k] - dt * 3); });
    if (a.pFaint > 0 && a.pFaint < 1) a.pFaint = Math.min(1, a.pFaint + dt * 3);
    if (a.eFaint > 0 && a.eFaint < 1) a.eFaint = Math.min(1, a.eFaint + dt * 3);

    // process queue first
    if (this.cur || this.q.length) {
      if (!this.cur) this.cur = this.q.shift();
      var c = this.cur;
      if (c.t === 'msg') {
        if (!c.started) { c.started = true; this.msg = PKM.Dialog.interp(c.s); this.msgChars = 0; c.wait = 0; }
        if (this.msgChars < this.msg.length) {
          this.msgChars += dt * (PKM.fastMode ? 180 : 80);
          if (PKM.Input.take('a')) this.msgChars = this.msg.length;
        } else if (c.auto !== undefined) {
          c.wait += dt;
          if (c.wait >= c.auto * (PKM.fastMode ? .5 : 1)) this.cur = null;
        } else if (PKM.Input.take('a') || PKM.Input.take('b')) { this.cur = null; PKM.Audio.sfx('select'); }
      } else if (c.t === 'fn') { this.cur = null; c.f(); }
      else if (c.t === 'hitAnim') {
        if (!c.started) {
          c.started = true;
          if (c.target === 'e') { a.eFlash = 1; a.pLunge = 1; } else { a.pFlash = 1; a.eLunge = 1; }
          a.shake = c.mult > 1 ? 1 : 0;
          PKM.Audio.sfx(c.mult > 1 ? 'superhit' : c.mult < 1 ? 'weakhit' : 'hit');
          c.wait = 0;
        }
        c.wait += dt;
        if (c.wait > .42) this.cur = null;
      } else if (c.t === 'faintAnim') {
        if (!c.started) { c.started = true; if (c.who === 'e') a.eFaint = 0.01; else a.pFaint = 0.01; PKM.Audio.sfx('faint'); c.wait = 0; }
        c.wait += dt;
        if (c.wait > .6) this.cur = null;
      } else if (c.t === 'ball') {
        if (!c.started) { c.started = true; c.wait = 0; c.shaken = 0; this.ballAnim = { phase: 'throw', t: 0, shakes: c.shakes }; PKM.Audio.sfx('ballthrow'); }
        var ba = this.ballAnim;
        ba.t += dt;
        if (ba.phase === 'throw' && ba.t > .6) { ba.phase = 'shake'; ba.t = 0; }
        else if (ba.phase === 'shake') {
          if (ba.t > .75) {
            ba.t = 0; c.shaken++;
            if (c.shaken >= Math.min(3, c.shakes)) { ba.phase = c.shakes >= 4 ? 'caught' : 'burst'; }
            else PKM.Audio.sfx('ballshake');
          }
        } else if (ba.phase === 'burst' && ba.t > .35) { this.ballAnim = null; this.cur = null; }
        else if (ba.phase === 'caught' && ba.t > .6) { this.cur = null; }
      } else if (c.t === 'learnMove') {
        this.handleLearnMove(c);
      } else if (c.t === 'end') { this.cur = null; this.endNow(); return; }
      return;
    }

    // phases
    if (this.result) { this.endNow(); return; }
    if (this.phase === 'intro') { this.phase = 'menu'; this.menuIdx = 0; }

    if (this.phase === 'menu') {
      var d = PKM.Input.menuDir();
      if (d === 'left' || d === 'right') { this.menuIdx = (this.menuIdx + (d === 'left' ? -1 : 1) + 4) % 4; if (this.menuIdx===1&&d==='left')this.menuIdx=0; PKM.Audio.sfx('select'); }
      if (d === 'up' || d === 'down') { this.menuIdx = (this.menuIdx + 2) % 4; PKM.Audio.sfx('select'); }
      if (PKM.Input.take('a')) {
        PKM.Audio.sfx('confirm');
        if (this.menuIdx === 0) { this.phase = 'moves'; this.moveIdx = 0; }
        else if (this.menuIdx === 1) this.openBattleBag();
        else if (this.menuIdx === 2) { this.phase = 'switchMenu'; this.forcedSwitch = false; }
        else this.tryRun();
      }
    } else if (this.phase === 'moves') {
      var d2 = PKM.Input.menuDir();
      var n = this.p.mon.moves.length;
      if (d2) {
        if (d2 === 'left' && this.moveIdx % 2 === 1) this.moveIdx--;
        if (d2 === 'right' && this.moveIdx % 2 === 0 && this.moveIdx + 1 < n) this.moveIdx++;
        if (d2 === 'up' && this.moveIdx >= 2) this.moveIdx -= 2;
        if (d2 === 'down' && this.moveIdx + 2 < n) this.moveIdx += 2;
        PKM.Audio.sfx('select');
      }
      if (PKM.Input.take('b')) { this.phase = 'menu'; PKM.Audio.sfx('cancel'); }
      else if (PKM.Input.take('a')) {
        var slot = this.p.mon.moves[this.moveIdx];
        if (slot.pp <= 0) { this.pushMsg('There\'s no PP left for this move!', .9); return; }
        PKM.Audio.sfx('confirm');
        this.phase = 'queue';
        this.execTurn({ type: 'move', move: slot });
      }
    } else if (this.phase === 'switchMenu') {
      var self = this;
      this.phase = 'busy';
      PKM.Menu.openParty({
        battle: true, forced: this.forcedSwitch, currentIdx: this.playerIdx,
        cb: function (idx) {
          if (idx < 0) {
            if (self.forcedSwitch) { self.phase = 'switchMenu'; return; } // must pick
            self.phase = 'menu'; return;
          }
          if (self.forcedSwitch || self.pivotSwitch) {
            self.pivotSwitch = false;
            self.phase = 'queue';
            self.q.push({ t: 'fn', f: function () { self.doSwitch(idx); } });
          } else {
            self.phase = 'queue';
            self.execTurn({ type: 'switch', idx: idx });
          }
        }
      });
    } else if (this.phase === 'queue') {
      if (!this.q.length && !this.cur) {
        if (this.p.v.fainted) { this.p.v.fainted = false; }
        this.phase = 'menu'; this.menuIdx = 0;
      }
    }
  };

  Scene.prototype.tryRun = function () {
    if (this.trainer) { this.pushMsg('No! There\'s no running from a Trainer battle!', .9); return; }
    if (this.e.mon.ability === 'arena-trap' || this.e.mon.ability === 'shadow-tag') {
      var sp = PKM.species(this.p.mon.pokeId);
      if (!(this.e.mon.ability === 'arena-trap' && (sp.types.indexOf('flying') >= 0 || this.p.mon.ability === 'levitate'))) {
        this.pushMsg('You can\'t escape!', .9); this.phase = 'queue'; this.execTurn({ type: 'item', item: null, skip: true }); return;
      }
    }
    this.runAttempts++;
    var ps = effStat(this.p, 'spe'), es = Math.max(1, effStat(this.e, 'spe'));
    var odds = (ps * 128 / es + 30 * this.runAttempts) % 256;
    if (ps >= es || U.ri(0, 255) < odds) {
      this.pushMsg('Got away safely!');
      this.finish('run');
      this.phase = 'queue';
    } else {
      this.pushMsg('Can\'t escape!', .9);
      this.phase = 'queue';
      this.execTurn({ type: 'run-fail' });
    }
  };

  Scene.prototype.openBattleBag = function () {
    var self = this;
    this.phase = 'busy';
    PKM.Menu.openBag({
      battle: true,
      cb: function (itemId, targetIdx) {
        if (!itemId) { self.phase = 'menu'; return; }
        self.phase = 'queue';
        self.execTurn({ type: 'item', item: itemId, target: targetIdx });
      }
    });
  };

  Scene.prototype.handleLearnMove = function (c) {
    var self = this, mon = c.mon, moveId = c.moveId;
    if (PKM.Mon.teach(mon, moveId)) {
      var m = PKM.move(moveId);
      this.cur = null;
      if (mon.moves.some(function (x) { return x.id === moveId && x.max === m.pp; }))
        this.q.unshift({ t: 'msg', s: PKM.Mon.name(mon) + ' learned ' + m.name + '!' });
      return;
    }
    this.cur = null;
    var m2 = PKM.move(moveId);
    var opts = mon.moves.map(function (ms) { return PKM.move(ms.id).name; }).concat(['Give up on ' + m2.name]);
    PKM.Dialog.ask(PKM.Mon.name(mon) + ' wants to learn ' + m2.name + ', but it already knows four moves. Forget which move?', opts, function (i) {
      if (i >= 0 && i < 4) {
        var old = PKM.move(mon.moves[i].id).name;
        mon.moves[i] = { id: moveId, pp: m2.pp, max: m2.pp };
        PKM.Dialog.say('1, 2, and... Poof! ' + PKM.Mon.name(mon) + ' forgot ' + old + ' and learned ' + m2.name + '!');
      } else {
        PKM.Dialog.say(PKM.Mon.name(mon) + ' did not learn ' + m2.name + '.');
      }
    }, { cancel: false });
  };

  /* --------------------------------- draw ---------------------------------- */
  Scene.prototype.draw = function (ctx) {
    var env = this.env, a = this.anim;
    // background
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    var pal = {
      outdoor: ['#8ecbe8', '#cfe8b0'], forest: ['#7ab890', '#a8d8a0'], cave: ['#5a4a44', '#8a7460'],
      snow: ['#b8d0ec', '#eef2f8'], beach: ['#88ccec', '#ecdca4'], marsh: ['#90a878', '#b8c8a0'],
      mountain: ['#a0b8d0', '#c8b8a0'], indoor: ['#b0a890', '#d8c8b0'], gym: ['#9098a8', '#c8c0b0'],
      galactic: ['#2a3448', '#48587a'], league: ['#8888c0', '#d0d0f0'], distortion: ['#3a2a58', '#6a4a88']
    }[env.theme || 'outdoor'] || ['#8ecbe8', '#cfe8b0'];
    grad.addColorStop(0, pal[0]); grad.addColorStop(1, pal[1]);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    var shakeX = a.shake > 0 ? Math.sin(this.t * 60) * 6 * a.shake : 0;

    // platforms
    ctx.fillStyle = 'rgba(0,0,0,.14)';
    ctx.beginPath(); ctx.ellipse(700 + shakeX, 308, 150, 38, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(240, 480, 180, 44, 0, 0, 7); ctx.fill();

    // enemy
    if (this.e.mon.hp > 0 || a.eFaint < 1) {
      var ex = 700 + (a.eLunge > 0 ? -Math.sin(a.eLunge * Math.PI) * 30 : 0) + shakeX;
      var ey = 90 + (a.eFaint > 0 ? a.eFaint * 120 : 0);
      ctx.save();
      if (a.eFlash > 0 && Math.floor(this.t * 16) % 2) ctx.globalAlpha = .3;
      if (a.eFaint > 0) ctx.globalAlpha = Math.max(0, 1 - a.eFaint);
      if (this.e.mon.shiny) ctx.filter = 'hue-rotate(120deg)';
      if (!(this.ballAnim && (this.ballAnim.phase === 'shake' || this.ballAnim.phase === 'caught')))
        PKM.Sprites.draw(ctx, this.e.mon.pokeId, 'front', ex - 120, ey, 240);
      ctx.restore();
      ctx.filter = 'none';
    }
    // ball animation
    if (this.ballAnim) {
      var ba = this.ballAnim;
      if (ba.phase === 'throw') {
        var bt = ba.t / .6;
        var bx = 200 + bt * 480, by = 300 - Math.sin(bt * Math.PI) * 180 + bt * (-90);
        PKM.GFX.drawBall(ctx, bx, by);
      } else {
        var wob = ba.phase === 'shake' ? Math.sin(ba.t * 12) * (ba.t < .4 ? 6 : 0) : 0;
        PKM.GFX.drawBall(ctx, 684 + wob, 200);
        if (ba.phase === 'caught') {
          PKM.GFX.text(ctx, '*click*', 720, 180, { size: 16, color: '#fff' });
        } else if (ba.phase === 'burst') {
          ctx.fillStyle = 'rgba(255,255,255,' + (1 - ba.t / .35) + ')';
          ctx.beginPath(); ctx.arc(700, 210, 40 + ba.t * 200, 0, 7); ctx.fill();
        }
      }
    }
    // player mon
    if (this.p.mon.hp > 0 || a.pFaint < 1) {
      var px = 240 + (a.pLunge > 0 ? Math.sin(a.pLunge * Math.PI) * 36 : 0);
      var py = 260 + (a.pFaint > 0 ? a.pFaint * 150 : 0);
      ctx.save();
      if (a.pFlash > 0 && Math.floor(this.t * 16) % 2) ctx.globalAlpha = .3;
      if (a.pFaint > 0) ctx.globalAlpha = Math.max(0, 1 - a.pFaint);
      if (this.p.mon.shiny) ctx.filter = 'hue-rotate(120deg)';
      PKM.Sprites.draw(ctx, this.p.mon.pokeId, 'back', px - 130, py - 30, 270);
      ctx.restore();
      ctx.filter = 'none';
    }

    // weather indicator
    if (weather) {
      var wname = { rain: 'RAIN', sun: 'HARSH SUN', sand: 'SANDSTORM', hail: 'SNOW' }[weather];
      PKM.GFX.text(ctx, wname, W / 2, 10, { size: 14, align: 'center', color: '#ffffff', bold: true });
    }

    this.drawInfoBoxes(ctx);

    // textbox
    var bx = 12, bh = 150, by = H - bh - 8, bw = W - 24;
    PKM.GFX.panel(ctx, bx, by, bw, bh);
    if (this.msg && (this.cur && this.cur.t === 'msg' || this.phase === 'queue' || this.q.length || this.cur)) {
      ctx.font = '21px Consolas, monospace';
      var lines = U.wrap(ctx, this.msg.slice(0, Math.floor(this.msgChars)), bw - 380);
      for (var i = 0; i < Math.min(3, lines.length); i++)
        PKM.GFX.text(ctx, lines[i], bx + 24, by + 24 + i * 30, { size: 21 });
    } else if (this.phase === 'menu') {
      PKM.GFX.text(ctx, 'What will ' + PKM.Mon.name(this.p.mon) + ' do?', bx + 24, by + 24, { size: 20 });
      var opts = ['FIGHT', 'BAG', 'POKEMON', 'RUN'];
      for (var m = 0; m < 4; m++) {
        var mx = bx + bw - 360 + (m % 2) * 180, my = by + 30 + Math.floor(m / 2) * 50;
        var sel = this.menuIdx === m;
        PKM.GFX.text(ctx, opts[m], mx + 24, my, { size: 22, bold: sel, color: sel ? '#ffe080' : '#f0f0f0' });
        if (sel) PKM.GFX.cursor(ctx, mx, my + 4, '#ffe080');
      }
    } else if (this.phase === 'moves') {
      var mvs = this.p.mon.moves;
      for (var v = 0; v < mvs.length; v++) {
        var mv = PKM.move(mvs[v].id);
        var vx = bx + 30 + (v % 2) * 330, vy = by + 22 + Math.floor(v / 2) * 56;
        var vsel = this.moveIdx === v;
        ctx.fillStyle = PKM.TYPE_COLORS[mv.type]; ctx.fillRect(vx + 18, vy + 2, 10, 18);
        PKM.GFX.text(ctx, mv.name, vx + 36, vy, { size: 20, bold: vsel, color: vsel ? '#ffe080' : '#f0f0f0' });
        PKM.GFX.text(ctx, 'PP ' + mvs[v].pp + '/' + mvs[v].max, vx + 36, vy + 22, { size: 14, color: '#a8b0c0' });
        if (vsel) PKM.GFX.cursor(ctx, vx, vy + 5, '#ffe080');
      }
      var cm = PKM.move(mvs[this.moveIdx].id);
      PKM.GFX.typeBadge(ctx, cm.type, bx + bw - 250, by + 18);
      PKM.GFX.text(ctx, cm.cls === 'physical' ? 'PHYS' : cm.cls === 'special' ? 'SPEC' : 'STAT', bx + bw - 250, by + 44, { size: 14, color: '#c0c8d8' });
      PKM.GFX.text(ctx, 'POW ' + (cm.power || '—'), bx + bw - 250, by + 70, { size: 16 });
      PKM.GFX.text(ctx, 'ACC ' + (cm.acc || '—'), bx + bw - 250, by + 94, { size: 16 });
    }
  };

  Scene.prototype.drawInfoBoxes = function (ctx) {
    // enemy box (top left)
    var e = this.e.mon;
    PKM.GFX.panel(ctx, 24, 24, 360, 86, 'light');
    PKM.GFX.text(ctx, PKM.Mon.name(e), 44, 38, { size: 20, bold: true, color: '#343430', shadow: false });
    PKM.GFX.text(ctx, (e.gender === 'm' ? '♂' : e.gender === 'f' ? '♀' : '') + ' Lv' + e.level, 290, 38, { size: 18, color: '#343430', shadow: false });
    PKM.GFX.hpBar(ctx, 84, 70, 240, e.hp, PKM.Mon.maxHp(e));
    PKM.GFX.text(ctx, 'HP', 50, 64, { size: 15, bold: true, color: '#787048', shadow: false });
    if (e.status) this.drawStatusTag(ctx, e.status, 44, 84);
    if (!this.trainer && PKM.G.dex.caught[e.pokeId]) {
      ctx.fillStyle = '#c84848'; ctx.beginPath(); ctx.arc(350, 86, 7, 0, 7); ctx.fill();
      ctx.fillStyle = '#f0f0f0'; ctx.fillRect(343, 85, 14, 2);
    }
    if (this.trainer) {
      for (var b = 0; b < this.enemyParty.length; b++) {
        ctx.fillStyle = this.enemyParty[b].hp > 0 ? '#e84848' : '#606068';
        ctx.beginPath(); ctx.arc(44 + b * 22, 104, 7, 0, 7); ctx.fill();
      }
    }
    // player box (right)
    var p = this.p.mon;
    PKM.GFX.panel(ctx, W - 396, 318, 372, 108, 'light');
    PKM.GFX.text(ctx, PKM.Mon.name(p), W - 372, 332, { size: 20, bold: true, color: '#343430', shadow: false });
    PKM.GFX.text(ctx, (p.gender === 'm' ? '♂' : p.gender === 'f' ? '♀' : '') + ' Lv' + p.level, W - 110, 332, { size: 18, color: '#343430', shadow: false });
    PKM.GFX.hpBar(ctx, W - 330, 364, 240, p.hp, PKM.Mon.maxHp(p));
    PKM.GFX.text(ctx, 'HP', W - 368, 358, { size: 15, bold: true, color: '#787048', shadow: false });
    PKM.GFX.text(ctx, p.hp + ' / ' + PKM.Mon.maxHp(p), W - 200, 380, { size: 16, color: '#343430', shadow: false });
    var spExp = PKM.species(p.pokeId);
    var cur = PKM.expForLevel(spExp.growth, p.level), nxt = PKM.expForLevel(spExp.growth, Math.min(100, p.level + 1));
    PKM.GFX.expBar(ctx, W - 330, 404, 280, nxt > cur ? (p.exp - cur) / (nxt - cur) : 1);
    if (p.status) this.drawStatusTag(ctx, p.status, W - 372, 380);
  };

  Scene.prototype.drawStatusTag = function (ctx, status, x, y) {
    var col = { par: '#d8b830', slp: '#9088a8', brn: '#e06030', psn: '#a050a8', tox: '#803088', frz: '#60b8d8' }[status];
    ctx.fillStyle = col; ctx.fillRect(x, y, 44, 18);
    PKM.GFX.text(ctx, status.toUpperCase(), x + 22, y + 2, { size: 12, align: 'center', bold: true });
  };

  function stageMul3(s) { s = U.clamp(s, -6, 6); return s >= 0 ? (3 + s) / 3 : 3 / (3 - s); }

  /* ----------------------------- evolution scene ---------------------------- */
  function EvolutionScene(mon, edge, done) {
    this.mon = mon; this.edge = edge; this.done = done;
    this.t = 0; this.phase = 'pre'; this.fromId = mon.pokeId;
    PKM.Audio.sfx('evolve');
  }
  EvolutionScene.prototype.update = function (dt) {
    this.t += dt;
    if (this.phase === 'pre') {
      if (PKM.Input.take('b')) { // cancel!
        PKM.Scenes.pop(this);
        PKM.Dialog.say('Huh? ' + PKM.Mon.name(this.mon) + ' stopped evolving!', this.done);
        return;
      }
      if (this.t > 2.6) {
        this.phase = 'post';
        var learned = PKM.Mon.evolve(this.mon, this.edge);
        this.learned = learned;
        PKM.State.markCaught(this.mon.pokeId);
        PKM.Audio.sfx('catch');
      }
    } else if (this.phase === 'post' && this.t > 3.4 && (PKM.Input.take('a') || this.t > 5)) {
      var self = this;
      PKM.Scenes.pop(this);
      var msgs = ['Congratulations! Your ' + PKM.species(this.fromId).name + ' evolved into ' + PKM.Mon.name(this.mon) + '!'];
      PKM.Dialog.say(msgs, function () {
        var teachNext = function () {
          if (!self.learned || !self.learned.length) { if (self.done) self.done(); return; }
          var mvId = self.learned.shift();
          if (PKM.Mon.teach(self.mon, mvId)) {
            PKM.Dialog.say(PKM.Mon.name(self.mon) + ' learned ' + PKM.move(mvId).name + '!', teachNext);
          } else teachNext();
        };
        teachNext();
      });
    }
  };
  EvolutionScene.prototype.draw = function (ctx) {
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#181838'); grad.addColorStop(1, '#383868');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    var pulse = Math.abs(Math.sin(this.t * 5));
    ctx.fillStyle = 'rgba(255,255,255,' + (this.phase === 'pre' && this.t > 1 ? pulse * .8 : 0) + ')';
    ctx.fillRect(0, 0, W, H);
    var id = this.phase === 'pre' ? this.fromId : this.mon.pokeId;
    ctx.save();
    if (this.phase === 'pre' && this.t > 1) ctx.filter = 'brightness(' + (1 + pulse * 6) + ')';
    PKM.Sprites.draw(ctx, id, 'front', W / 2 - 140, 140, 280);
    ctx.restore(); ctx.filter = 'none';
    PKM.GFX.text(ctx, this.phase === 'pre' ? 'What? ' + PKM.species(this.fromId).name + ' is evolving!' : '', W / 2, 520, { size: 22, align: 'center' });
    if (this.phase === 'pre') PKM.GFX.text(ctx, '(Press X to stop)', W / 2, 560, { size: 15, align: 'center', color: '#a0a8c0' });
  };

  return {
    start: function (opts) { PKM.Scenes.push(new Scene(opts)); },
    startEvolution: function (mon, edge, done) { PKM.Scenes.push(new EvolutionScene(mon, edge, done)); }
  };
})();
