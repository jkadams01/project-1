/* Global namespace + data registry. Loaded first. */
window.PKM = {
  VERSION: '1.0.0',
  TILE: 32,              // on-screen tile size (16px art at 2x)
  VIEW_W: 30, VIEW_H: 20,
  DATA: {},              // raw registered data payloads
  MAPS: {},              // mapId -> map definition
  SCRIPTS: {},           // scriptId -> event script (story.js)

  registerData: function (key, payload) { this.DATA[key] = payload; },
  registerMap: function (id, def) { def.id = id; this.MAPS[id] = def; },
  registerScripts: function (obj) { for (var k in obj) this.SCRIPTS[k] = obj[k]; },

  /* Build lookup indexes once every data file has loaded. */
  initData: function () {
    var D = this.DATA;
    D.speciesById = {};
    D.species.list.forEach(function (s) { D.speciesById[s.id] = s; });
    D.movesById = {};
    D.moves.list.forEach(function (m) { D.movesById[m.id] = m; });
    D.movesByIdent = {};
    D.moves.list.forEach(function (m) { D.movesByIdent[m.ident] = m; });
    // dex ordering: species 1..1025 then forms grouped after their species
    D.dexOrder = D.species.list.slice().sort(function (a, b) {
      return (a.species - b.species) || (a.id - b.id);
    });
  },

  species: function (id) { return this.DATA.speciesById[id]; },
  move: function (id) { return typeof id === 'string' ? this.DATA.movesByIdent[id] : this.DATA.movesById[id]; },

  typeMult: function (atkType, defTypes) {
    var chart = this.DATA.typechart, m = 1;
    for (var i = 0; i < defTypes.length; i++) {
      var row = chart[atkType];
      if (row && row[defTypes[i]] !== undefined) m *= row[defTypes[i]];
    }
    return m;
  },

  learnset: function (pokeId) { // -> [[level, moveId], ...]
    var flat = this.DATA.learnsets[String(pokeId)] || [];
    var out = [];
    for (var i = 0; i < flat.length; i += 2) out.push([flat[i], flat[i + 1]]);
    return out;
  },

  movesAtLevel: function (pokeId, level) { // last 4 level-up moves
    var ls = this.learnset(pokeId).filter(function (p) { return p[0] <= level; });
    var seen = {}, out = [];
    for (var i = ls.length - 1; i >= 0 && out.length < 4; i--) {
      if (!seen[ls[i][1]]) { seen[ls[i][1]] = 1; out.unshift(ls[i][1]); }
    }
    return out.length ? out : [33]; // tackle fallback
  },

  expForLevel: function (growth, level) {
    var c = this.DATA.expcurves[String(growth)];
    return c ? c[Math.max(0, Math.min(99, level - 1))] : level * level * level;
  },

  TYPE_COLORS: {
    normal: '#A8A878', fire: '#F08030', water: '#6890F0', electric: '#F8D030',
    grass: '#78C850', ice: '#98D8D8', fighting: '#C03028', poison: '#A040A0',
    ground: '#E0C068', flying: '#A890F0', psychic: '#F85888', bug: '#A8B820',
    rock: '#B8A038', ghost: '#705898', dragon: '#7038F8', dark: '#705848',
    steel: '#B8B8D0', fairy: '#EE99AC'
  }
};
