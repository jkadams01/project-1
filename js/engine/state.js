/* Global game state + save/load. */
PKM.G = null;
PKM.Save = (function () {
  var KEY = 'pkm_platinum_remake_save_v1';

  function newGame(name, gender) {
    PKM.G = {
      ver: PKM.VERSION,
      name: name || 'LUCAS', gender: gender || 'm',
      rivalName: 'BARRY',
      map: 'twinleaf_home_2f', x: 5, y: 4, dir: 'down',
      money: 3000,
      badges: [false, false, false, false, false, false, false, false],
      party: [], boxes: [[], [], [], [], [], [], [], []],
      bag: {}, // itemId -> count
      flags: {},
      dex: { seen: {}, caught: {} },
      repel: 0, playSec: 0,
      visited: { twinleaf: true },
      lastHeal: { map: 'twinleaf_home_2f', x: 5, y: 4 },
      options: { textSpeed: 2 }
    };
    return PKM.G;
  }

  return {
    newGame: newGame,
    exists: function () { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } },
    save: function () {
      var G = PKM.G;
      var ow = PKM.Overworld;
      if (ow && ow.mapId) { G.map = ow.mapId; G.x = ow.player.x; G.y = ow.player.y; G.dir = ow.player.dir; }
      try { localStorage.setItem(KEY, JSON.stringify(G)); return true; }
      catch (e) { return false; }
    },
    load: function () {
      try {
        var s = localStorage.getItem(KEY);
        if (!s) return null;
        PKM.G = JSON.parse(s);
        return PKM.G;
      } catch (e) { return null; }
    },
    wipe: function () { try { localStorage.removeItem(KEY); } catch (e) {} }
  };
})();

PKM.State = {
  flag: function (f) { return !!PKM.G.flags[f]; },
  setFlag: function (f, v) { PKM.G.flags[f] = (v === undefined ? true : v); },
  addItem: function (id, n) {
    var G = PKM.G; n = n || 1;
    G.bag[id] = (G.bag[id] || 0) + n;
    if (G.bag[id] <= 0) delete G.bag[id];
  },
  takeItem: function (id, n) { this.addItem(id, -(n || 1)); },
  itemCount: function (id) { return PKM.G.bag[id] || 0; },
  hasItem: function (id) { return (PKM.G.bag[id] || 0) > 0; },
  addMoney: function (n) { PKM.G.money = Math.max(0, PKM.G.money + n); },
  badgeCount: function () { return PKM.G.badges.filter(Boolean).length; },
  markSeen: function (pokeId) { PKM.G.dex.seen[pokeId] = 1; },
  markCaught: function (pokeId) { PKM.G.dex.seen[pokeId] = 1; PKM.G.dex.caught[pokeId] = 1; },
  dexCounts: function () {
    var seenSp = {}, caughtSp = {}, G = PKM.G, id;
    for (id in G.dex.seen) { var s = PKM.species(+id); if (s) seenSp[s.species] = 1; }
    for (id in G.dex.caught) { var c = PKM.species(+id); if (c) caughtSp[c.species] = 1; }
    return { seen: Object.keys(seenSp).length, caught: Object.keys(caughtSp).length, total: 1025 };
  },
  givePokemon: function (mon) {
    var G = PKM.G;
    this.markCaught(mon.pokeId);
    if (G.party.length < 6) { G.party.push(mon); return 'party'; }
    for (var b = 0; b < G.boxes.length; b++) {
      if (G.boxes[b].length < 30) { G.boxes[b].push(mon); return 'box ' + (b + 1); }
    }
    return null;
  },
  healParty: function () {
    PKM.G.party.forEach(function (m) { PKM.Mon.heal(m); });
  },
  firstAlive: function () {
    for (var i = 0; i < PKM.G.party.length; i++) if (PKM.G.party[i].hp > 0) return i;
    return -1;
  },
  canUseField: function (what) {
    var G = PKM.G, S = PKM.State;
    switch (what) {
      case 'cut':       return S.hasItem('hatchet') && G.badges[1];
      case 'rocksmash': return S.hasItem('miners-hammer') && G.badges[0];
      case 'strength':  return S.hasItem('power-gauntlets') && G.badges[2];
      case 'surf':      return S.hasItem('wavewalker-charm') && G.badges[4];
      case 'waterfall': return S.hasItem('cascade-charm') && G.badges[7];
      case 'climb':     return S.hasItem('climbing-gear') && G.badges[6];
      case 'defog':     return S.hasItem('defog-charm');
      case 'flash':     return S.hasItem('lantern');
      case 'fly':       return S.hasItem('sky-shuttle-pass') && G.badges[2];
    }
    return false;
  },
  fieldHint: function (what) {
    var names = {
      cut: ['Hatchet', 'Forest Badge'], rocksmash: ['Miner’s Hammer', 'Coal Badge'],
      strength: ['Power Gauntlets', 'Relic Badge'], surf: ['Wavewalker Charm', 'Fen Badge'],
      waterfall: ['Cascade Charm', 'Beacon Badge'], climb: ['Climbing Gear', 'Icicle Badge'],
      defog: ['Defog Charm', ''], flash: ['Lantern', ''], fly: ['Sky Shuttle Pass', 'Relic Badge']
    };
    return names[what];
  }
};
