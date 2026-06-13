/* Pokemon instances are plain serializable objects:
   { pokeId, level, exp, ivs[6], nature, gender, ability, shiny,
     moves:[{id,pp,max}], hp, status(''|'par'|'slp'|'brn'|'psn'|'tox'|'frz'),
     sleepTurns, happy, ot } */
PKM.Mon = (function () {
  var U = PKM.U;
  // [name, upIndex, downIndex] into stats [hp,atk,def,spa,spd,spe]
  var NATURES = [
    ['Hardy', 0, 0], ['Lonely', 1, 2], ['Brave', 1, 5], ['Adamant', 1, 3], ['Naughty', 1, 4],
    ['Bold', 2, 1], ['Docile', 0, 0], ['Relaxed', 2, 5], ['Impish', 2, 3], ['Lax', 2, 4],
    ['Timid', 5, 1], ['Hasty', 5, 2], ['Serious', 0, 0], ['Jolly', 5, 3], ['Naive', 5, 4],
    ['Modest', 3, 1], ['Mild', 3, 2], ['Quiet', 3, 5], ['Bashful', 0, 0], ['Rash', 3, 4],
    ['Calm', 4, 1], ['Gentle', 4, 2], ['Sassy', 4, 5], ['Careful', 4, 3], ['Quirky', 0, 0]
  ];

  function statOf(mon, i) {
    var sp = PKM.species(mon.pokeId), base = sp.stats[i], iv = mon.ivs[i], L = mon.level;
    if (i === 0) {
      if (sp.ident === 'shedinja') return 1;
      return Math.floor((2 * base + iv) * L / 100) + L + 10;
    }
    var v = Math.floor((2 * base + iv) * L / 100) + 5;
    var n = NATURES[mon.nature];
    if (n[1] === i && n[2] !== i) v = Math.floor(v * 1.1);
    if (n[2] === i && n[1] !== i) v = Math.floor(v * 0.9);
    return v;
  }

  function make(pokeId, level, opts) {
    opts = opts || {};
    var sp = PKM.species(pokeId);
    if (!sp) { pokeId = 129; sp = PKM.species(129); } // magikarp guard
    var ivs = opts.ivs || [0, 0, 0, 0, 0, 0].map(function () { return U.ri(0, 31); });
    var gender = 'n';
    if (sp.gender >= 0) gender = U.ri(0, 7) < sp.gender ? 'f' : 'm';
    if (opts.gender) gender = opts.gender;
    var mon = {
      pokeId: pokeId, level: level,
      exp: PKM.expForLevel(sp.growth, level),
      ivs: ivs, nature: opts.nature !== undefined ? opts.nature : U.ri(0, 24),
      gender: gender,
      ability: opts.ability || U.pick(sp.abilities.slice(0, 2).length ? sp.abilities.slice(0, 2) : ['']),
      shiny: opts.shiny !== undefined ? opts.shiny : U.ri(1, 512) === 1,
      moves: null, hp: 0, status: '', sleepTurns: 0,
      happy: sp.happy, ot: opts.ot || 'WILD', heldItem: opts.heldItem || ''
    };
    var mvIds = opts.moves || PKM.movesAtLevel(pokeId, level);
    mon.moves = mvIds.map(function (id) {
      var m = PKM.move(id);
      return { id: m ? m.id : 33, pp: m ? m.pp : 35, max: m ? m.pp : 35 };
    });
    mon.hp = statOf(mon, 0);
    return mon;
  }

  function expToNext(mon) {
    var sp = PKM.species(mon.pokeId);
    if (mon.level >= 100) return Infinity;
    return PKM.expForLevel(sp.growth, mon.level + 1) - mon.exp;
  }

  /* Add exp; returns array of events:
     {type:'level', level} | {type:'move', moveId} | {type:'evolve', to} */
  function gainExp(mon, amount) {
    var sp = PKM.species(mon.pokeId), events = [];
    if (mon.level >= 100) return events;
    mon.exp += amount;
    while (mon.level < 100 && mon.exp >= PKM.expForLevel(sp.growth, mon.level + 1)) {
      var oldMax = statOf(mon, 0);
      mon.level++;
      mon.happy = Math.min(255, mon.happy + 3);
      var newMax = statOf(mon, 0);
      if (mon.hp > 0) mon.hp = Math.min(newMax, mon.hp + (newMax - oldMax));
      events.push({ type: 'level', level: mon.level });
      PKM.learnset(mon.pokeId).forEach(function (p) {
        if (p[0] === mon.level) events.push({ type: 'move', moveId: p[1] });
      });
    }
    var evo = checkEvolve(mon, {});
    if (evo) events.push({ type: 'evolve', edge: evo });
    return events;
  }

  /* ctx: {item, weather, party} */
  function checkEvolve(mon, ctx) {
    if (mon.heldItem === 'everstone') return null;
    var edges = PKM.DATA.evolutions.edges[String(mon.pokeId)];
    if (!edges) return null;
    var party = ctx.party || (PKM.G ? PKM.G.party : []);
    for (var i = 0; i < edges.length; i++) {
      var e = edges[i], ok = true;
      if (e.item) { if (ctx.item !== e.item) continue; }
      else if (ctx.item) continue; // using an item only triggers item edges
      if (e.level && mon.level < e.level) ok = false;
      if (e.happy && mon.happy < e.happy) ok = false;
      if (e.gender && mon.gender !== e.gender) ok = false;
      if (e.time) {
        var tw = PKM.U.timeWord();
        var isDay = PKM.U.isDay();
        if (e.time === 'day' && !isDay) ok = false;
        if (e.time === 'night' && isDay) ok = false;
        if (e.time === 'dusk' && tw !== 'dusk') ok = false;
        if (e.time === 'full-moon' && !(tw === 'night')) ok = false;
      }
      if (e.knownMove && !mon.moves.some(function (m) { return m.id === e.knownMove; })) ok = false;
      if (e.knownMoveType && !mon.moves.some(function (m) {
        var mm = PKM.move(m.id); return mm && mm.type === e.knownMoveType;
      })) ok = false;
      if (e.partySpecies && !party.some(function (p) {
        return PKM.species(p.pokeId).species === e.partySpecies;
      })) ok = false;
      if (e.partyType && !party.some(function (p) {
        return PKM.species(p.pokeId).types.indexOf(e.partyType) >= 0;
      })) ok = false;
      if (e.atkDef !== undefined) {
        var atk = statOf(mon, 1), def = statOf(mon, 2);
        var rel = atk > def ? 1 : (atk < def ? -1 : 0);
        if (rel !== e.atkDef) ok = false;
      }
      if (e.rain && ctx.weather !== 'rain') ok = false;
      if (ok) return e;
    }
    return null;
  }

  function evolve(mon, edge) {
    var oldMaxHp = statOf(mon, 0);
    var target = edge.to;
    // gendered target forms (meowstic/indeedee/basculegion/oinkologne...)
    var gf = PKM.DATA.evolutions.genderForms[String(target)];
    if (gf && mon.gender === 'f') target = gf;
    // toxtricity nature split
    var tsp = PKM.species(target);
    if (tsp && tsp.ident === 'toxtricity' && [1,3,4,7,8,10,13,14,19,22].indexOf(mon.nature % 25) < 0) {
      var lk = PKM.DATA.species.list.filter(function (s) { return s.ident === 'toxtricity-low-key'; })[0];
      if (lk) target = lk.id;
    }
    mon.pokeId = target;
    var newMax = statOf(mon, 0);
    mon.hp = Math.max(1, Math.min(newMax, mon.hp + (newMax - oldMaxHp)));
    // pick up moves the new form learns at this exact level or as evo move (lvl 1)
    var out = [];
    PKM.learnset(target).forEach(function (p) {
      if (p[0] === mon.level || p[0] === 1) {
        if (!mon.moves.some(function (m) { return m.id === p[1]; })) out.push(p[1]);
      }
    });
    return out.slice(-2); // at most 2 offers to keep it snappy
  }

  function teach(mon, moveId) { // returns false if party full of moves
    var m = PKM.move(moveId);
    if (!m) return true;
    if (mon.moves.some(function (x) { return x.id === moveId; })) return true;
    if (mon.moves.length < 4) { mon.moves.push({ id: moveId, pp: m.pp, max: m.pp }); return true; }
    return false;
  }

  function heal(mon) {
    mon.hp = statOf(mon, 0); mon.status = ''; mon.sleepTurns = 0;
    mon.moves.forEach(function (m) { m.pp = m.max; });
  }

  function expYield(mon, isTrainer) {
    var sp = PKM.species(mon.pokeId);
    return Math.max(1, Math.floor(sp.baseExp * mon.level / 7 * (isTrainer ? 1.5 : 1)));
  }

  function catchRoll(mon, ballMult, opts) {
    var sp = PKM.species(mon.pokeId);
    var maxHp = statOf(mon, 0);
    var statusB = (mon.status === 'slp' || mon.status === 'frz') ? 2 :
                  (mon.status ? 1.5 : 1);
    var a = ((3 * maxHp - 2 * mon.hp) * sp.catch * ballMult) / (3 * maxHp) * statusB;
    if (a >= 255) return 4;
    var b = 1048560 / Math.sqrt(Math.sqrt(16711680 / a));
    var shakes = 0;
    for (var i = 0; i < 4; i++) { if (U.ri(0, 65535) < b) shakes++; else break; }
    return shakes; // 4 = caught
  }

  return {
    NATURES: NATURES, make: make, stat: statOf, gainExp: gainExp,
    expToNext: expToNext, checkEvolve: checkEvolve, evolve: evolve,
    teach: teach, heal: heal, expYield: expYield, catchRoll: catchRoll,
    name: function (mon) { return PKM.species(mon.pokeId).name; },
    maxHp: function (mon) { return statOf(mon, 0); }
  };
})();
