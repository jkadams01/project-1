/* Procedural graphics: tile atlases per theme, character sprites, UI prims.
   All art is generated with canvas primitives at boot - no external assets. */
PKM.GFX = (function () {
  var T = 32; // tile px
  var atlases = {}; // theme -> {canvas, cols:{char:index}}
  var CHARS = ['.', ',', '=', '#', '~', 'T', 'R', 'B', 'W', 'C', '^', '*', 'o', '-', 's', 'i', 'D', 'S', 'H', 'P', 'M', 'G', 'L', ' '];

  var THEMES = {
    outdoor:   { ground: '#7ec850', fleck: '#6eb344', path: '#e0c87e', pathEdge: '#c4a857', water: '#3e7ed0', water2: '#5b97e0', grass: '#3f9e3a', grass2: '#2e7c2c', block: 'tree', rock: '#9a8c70', wallTop: '#5a8c46', flower: ['#f2dd6e', '#e87979'], ledge: '#5da23f', sand: '#e8d8a0', roofH: '#c8743c', wood: '#a8743c' },
    forest:    { ground: '#5da23f', fleck: '#4f8f35', path: '#cbb168', pathEdge: '#a98f4c', water: '#2f6cb8', water2: '#4a85cc', grass: '#2e7c2c', grass2: '#1f5e20', block: 'tree2', rock: '#8a7c62', flower: ['#e8e8a0', '#d878c8'], ledge: '#447c2f', sand: '#d8c890', roofH: '#b06438', wood: '#946434' },
    beach:     { ground: '#ecdca4', fleck: '#dcc88c', path: '#d8bc80', pathEdge: '#bca066', water: '#38a0c8', water2: '#58b8dc', grass: '#a8c860', grass2: '#88a848', block: 'palm', rock: '#b0a080', flower: ['#f2dd6e', '#e87979'], ledge: '#c8b078', sand: '#ecdca4', roofH: '#c8743c', wood: '#a8743c' },
    cave:      { ground: '#8a7460', fleck: '#7a6450', path: '#9a8470', pathEdge: '#6a5440', water: '#28488a', water2: '#3a5ea0', grass: '#6a5a4a', grass2: '#564738', block: 'rock', rock: '#6a5644', flower: ['#b0a8d8', '#8a82c0'], ledge: '#6a5644', sand: '#9a8a70', roofH: '#6a5644', wood: '#6a5644' },
    mountain:  { ground: '#b0987c', fleck: '#a08868', path: '#c8b090', pathEdge: '#947c5c', water: '#3e7ed0', water2: '#5b97e0', grass: '#7c9c54', grass2: '#5e8040', block: 'rock', rock: '#8a7458', flower: ['#e8e8a0', '#e87979'], ledge: '#8a7050', sand: '#c8b090', roofH: '#9a7c54', wood: '#8a6c44' },
    snow:      { ground: '#eef2f8', fleck: '#dde4f0', path: '#cdd6e4', pathEdge: '#aab6cc', water: '#5078b8', water2: '#6c92cc', grass: '#c2d2e6', grass2: '#9cb2d0', block: 'pine', rock: '#9aa4b8', flower: ['#cfe0ff', '#a8c0e8'], ledge: '#c0cce0', sand: '#dde4f0', roofH: '#7c94c0', wood: '#8a7460' },
    marsh:     { ground: '#8aa05c', fleck: '#7a9050', path: '#b0a070', pathEdge: '#90804f', water: '#5a7a52', water2: '#6e8e64', grass: '#5c7c3c', grass2: '#48642e', block: 'tree2', rock: '#8a8060', flower: ['#d8c8e8', '#b8d870'], ledge: '#6c8444', sand: '#a89860', roofH: '#8a6c44', wood: '#7a5c34' },
    indoor:    { ground: '#e8d8b8', fleck: '#dccaa6', path: '#c8a878', pathEdge: '#a8885a', water: '#4888c8', water2: '#60a0d8', grass: '#b8d8a0', grass2: '#98b880', block: 'wall', rock: '#b09878', wall: '#b07c50', wallDark: '#8a5c38', flower: ['#e87979', '#f2dd6e'], ledge: '#c8b088', sand: '#e0d0b0', roofH: '#b07c50', wood: '#a8743c' },
    center:    { ground: '#f0e4e4', fleck: '#e4d4d4', path: '#e88a8a', pathEdge: '#c86a6a', water: '#4888c8', water2: '#60a0d8', grass: '#b8d8a0', grass2: '#98b880', block: 'wall', rock: '#b09878', wall: '#e87060', wallDark: '#b85040', flower: ['#f2dd6e', '#e87979'], ledge: '#d8c8c8', sand: '#f0e4e4', roofH: '#e87060', wood: '#c87858' },
    mart:      { ground: '#dce8f0', fleck: '#ccdce8', path: '#7898d0', pathEdge: '#5878b0', water: '#4888c8', water2: '#60a0d8', grass: '#b8d8a0', grass2: '#98b880', block: 'wall', rock: '#b09878', wall: '#5888c8', wallDark: '#3868a8', flower: ['#f2dd6e', '#e87979'], ledge: '#c0d0e0', sand: '#dce8f0', roofH: '#5888c8', wood: '#8898b0' },
    gym:       { ground: '#cfc8b8', fleck: '#bfb8a8', path: '#a89868', pathEdge: '#887848', water: '#4878c0', water2: '#6090d0', grass: '#a8c890', grass2: '#88a870', block: 'pillar', rock: '#988868', wall: '#8a8278', wallDark: '#6a6258', flower: ['#f2dd6e', '#e87979'], ledge: '#b0a890', sand: '#cfc8b8', roofH: '#8a8278', wood: '#98906c' },
    galactic:  { ground: '#3a4458', fleck: '#323a4c', path: '#4a5870', pathEdge: '#2a3444', water: '#1e2c48', water2: '#2c3c5c', grass: '#384c5c', grass2: '#2c3c48', block: 'tech', rock: '#4a5468', wall: '#566884', wallDark: '#38465c', flower: ['#6ee0d8', '#5ac0e8'], ledge: '#46546c', sand: '#3a4458', roofH: '#566884', wood: '#46546c' },
    league:    { ground: '#d8d4ec', fleck: '#c8c4e0', path: '#b0a8d8', pathEdge: '#8a82c0', water: '#5068c8', water2: '#6880d8', grass: '#a8b8d8', grass2: '#8898c0', block: 'pillar', rock: '#9890b8', wall: '#7a72a8', wallDark: '#5a5288', flower: ['#f2dd6e', '#8ae0c0'], ledge: '#b8b0d8', sand: '#d8d4ec', roofH: '#7a72a8', wood: '#9088b8' },
    distortion:{ ground: '#4a3a5e', fleck: '#3e3050', path: '#5e4a78', pathEdge: '#352a44', water: '#241c3a', water2: '#382c54', grass: '#3c4468', grass2: '#2c3450', block: 'crystal', rock: '#5e5078', wall: '#6a5a8a', wallDark: '#483c64', flower: ['#9a6ee0', '#6ec0e0'], ledge: '#564670', sand: '#4a3a5e', roofH: '#6a5a8a', wood: '#564670' }
  };

  function hash(n) { n = (n * 2654435761) % 4294967296; return (n >>> 8) / 16777216; }

  function px(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); }

  function drawTileInto(c, ch, p, f, ox) {
    // base ground for overlay tiles
    var groundChars = { ',': 1, '*': 1, 'o': 1, '^': 1, 'S': 1, 'I': 1 };
    px(c, ox, 0, T, T, p.ground);
    px(c, ox + 6, 8, 3, 3, p.fleck); px(c, ox + 20, 22, 3, 3, p.fleck); px(c, ox + 14, 4, 2, 2, p.fleck); px(c, ox + 26, 12, 2, 2, p.fleck);
    if (ch === '.') return;
    if (ch === ' ') { px(c, ox, 0, T, T, '#10131a'); return; }
    if (ch === '=') {
      px(c, ox, 0, T, T, p.path); px(c, ox, 0, T, 2, p.pathEdge); px(c, ox, T - 2, T, 2, p.pathEdge);
      px(c, ox + 8, 12, 3, 2, p.pathEdge); px(c, ox + 20, 22, 3, 2, p.pathEdge); return;
    }
    if (ch === ',') {
      px(c, ox, 0, T, T, p.grass);
      for (var i = 0; i < 5; i++) {
        var gx = ox + 2 + i * 6 + (f ? 1 : 0);
        c.fillStyle = p.grass2;
        c.beginPath(); c.moveTo(gx, 28); c.lineTo(gx + 3, 8 + (i % 2) * 4 + f * 2); c.lineTo(gx + 6, 28); c.fill();
      }
      return;
    }
    if (ch === '~' || ch === 's' || ch === 'W') {
      px(c, ox, 0, T, T, ch === 's' ? p.water2 : p.water);
      c.fillStyle = ch === 'W' ? '#cfe6ff' : p.water2;
      var off = f ? 4 : 0;
      if (ch === 'W') { for (var wx = 0; wx < 4; wx++) px(c, ox + 3 + wx * 8, (off + wx * 5) % 8, 2, 26, 'rgba(230,242,255,.7)'); px(c, ox, 26 + (f?2:0), T, 4, 'rgba(255,255,255,.5)'); }
      else { px(c, ox + 4 + off, 8, 10, 2, p.water2); px(c, ox + 18 - off, 20, 10, 2, p.water2); }
      if (ch === 's') { px(c, ox + 6, 14, 4, 3, p.sand); px(c, ox + 20, 24, 5, 3, p.sand); }
      return;
    }
    if (ch === '-') {
      px(c, ox, 0, T, T, p.water);
      px(c, ox, 4, T, 24, p.wood); c.fillStyle = 'rgba(0,0,0,.25)';
      for (var bx = 0; bx < 4; bx++) px(c, ox + bx * 8 + 7, 4, 1, 24, 'rgba(0,0,0,.25)');
      px(c, ox, 4, T, 2, 'rgba(255,255,255,.3)'); px(c, ox, 26, T, 2, 'rgba(0,0,0,.35)'); return;
    }
    if (ch === '#') {
      var s = p.block;
      if (s === 'tree' || s === 'tree2' || s === 'pine' || s === 'palm') {
        px(c, ox + 13, 20, 6, 10, '#7a5230');
        c.fillStyle = s === 'pine' ? '#3c6648' : p.grass2;
        if (s === 'pine') {
          c.beginPath(); c.moveTo(ox + 16, 0); c.lineTo(ox + 29, 24); c.lineTo(ox + 3, 24); c.fill();
          px(c, ox + 8, 8, 16, 3, '#eef2f8'); px(c, ox + 5, 16, 22, 3, '#eef2f8');
        } else {
          c.beginPath(); c.arc(ox + 16, 13, 13, 0, 7); c.fill();
          c.fillStyle = p.grass; c.beginPath(); c.arc(ox + 12, 9, 8, 0, 7); c.fill();
        }
        return;
      }
      if (s === 'rock') {
        px(c, ox, 0, T, T, p.rock);
        px(c, ox, 0, T, 4, 'rgba(255,255,255,.18)'); px(c, ox, T - 6, T, 6, 'rgba(0,0,0,.3)');
        px(c, ox + 4, 10, 8, 3, 'rgba(0,0,0,.2)'); px(c, ox + 18, 18, 9, 3, 'rgba(0,0,0,.2)'); return;
      }
      if (s === 'wall') { px(c, ox, 0, T, T, p.wall); px(c, ox, T - 8, T, 8, p.wallDark); px(c, ox, 0, T, 3, 'rgba(255,255,255,.25)'); return; }
      if (s === 'pillar') { px(c, ox, 0, T, T, p.wall); px(c, ox + 4, 0, 4, T, 'rgba(255,255,255,.2)'); px(c, ox + 24, 0, 4, T, 'rgba(0,0,0,.2)'); return; }
      if (s === 'tech') {
        px(c, ox, 0, T, T, p.wall); px(c, ox + 2, 2, T - 4, T - 4, p.wallDark);
        px(c, ox + 6, 6, 6, 6, '#6ee0d8'); px(c, ox + 20, 20, 6, 6, '#3a8ac0'); return;
      }
      if (s === 'crystal') {
        px(c, ox, 0, T, T, p.wall);
        c.fillStyle = '#9a6ee0'; c.beginPath(); c.moveTo(ox + 16, 2); c.lineTo(ox + 28, 16); c.lineTo(ox + 16, 30); c.lineTo(ox + 4, 16); c.fill();
        px(c, ox + 12, 8, 4, 8, '#c8aaff'); return;
      }
    }
    if (ch === 'T') { // cuttable tree (small, lighter)
      px(c, ox + 13, 22, 6, 8, '#7a5230');
      c.fillStyle = '#58c048'; c.beginPath(); c.arc(ox + 16, 14, 10, 0, 7); c.fill();
      c.fillStyle = '#88e070'; c.beginPath(); c.arc(ox + 13, 11, 5, 0, 7); c.fill();
      px(c, ox + 14, 24, 4, 2, '#4a3018'); return;
    }
    if (ch === 'R') { // smashable cracked rock
      c.fillStyle = p.rock; c.beginPath(); c.arc(ox + 16, 18, 12, 0, 7); c.fill();
      c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(ox + 10, 10); c.lineTo(ox + 16, 18); c.lineTo(ox + 12, 26); c.moveTo(ox + 16, 18); c.lineTo(ox + 23, 22); c.stroke();
      return;
    }
    if (ch === 'B') { // strength boulder
      px(c, ox + 3, 3, 26, 26, p.rock); px(c, ox + 3, 3, 26, 5, 'rgba(255,255,255,.25)');
      px(c, ox + 3, 23, 26, 6, 'rgba(0,0,0,.3)'); px(c, ox + 9, 11, 5, 5, 'rgba(0,0,0,.18)'); px(c, ox + 19, 15, 5, 5, 'rgba(0,0,0,.18)');
      return;
    }
    if (ch === 'C') { // climbable wall
      px(c, ox, 0, T, T, p.rock);
      px(c, ox, 6, T, 2, 'rgba(0,0,0,.3)'); px(c, ox, 16, T, 2, 'rgba(0,0,0,.3)'); px(c, ox, 26, T, 2, 'rgba(0,0,0,.3)');
      px(c, ox + 8, 3, 3, 3, 'rgba(255,255,255,.3)'); px(c, ox + 20, 12, 3, 3, 'rgba(255,255,255,.3)'); px(c, ox + 10, 22, 3, 3, 'rgba(255,255,255,.3)');
      return;
    }
    if (ch === '^') { px(c, ox, 22, T, 6, p.ledge); px(c, ox, 27, T, 3, 'rgba(0,0,0,.3)'); px(c, ox, 21, T, 2, 'rgba(255,255,255,.25)'); return; }
    if (ch === '*') {
      var fl = p.flower, sway = f ? 1 : -1;
      px(c, ox + 7 + sway, 8, 6, 6, fl[0]); px(c, ox + 9 + sway, 10, 2, 2, '#a06820'); px(c, ox + 9, 14, 2, 5, p.grass2);
      px(c, ox + 20 - sway, 18, 6, 6, fl[1]); px(c, ox + 22 - sway, 20, 2, 2, '#a06820'); px(c, ox + 22, 24, 2, 5, p.grass2);
      return;
    }
    if (ch === 'o') { c.fillStyle = p.rock; c.beginPath(); c.arc(ox + 16, 22, 7, 0, 7); c.fill(); px(c, ox + 11, 17, 5, 3, 'rgba(255,255,255,.25)'); return; }
    if (ch === 'i') { px(c, ox, 0, T, T, '#bcd8f0'); px(c, ox + 4, 4, 10, 3, '#e8f4ff'); px(c, ox + 18, 20, 8, 3, '#e8f4ff'); return; }
    if (ch === 'D') { px(c, ox, 0, T, T, p.wallDark || p.roofH); px(c, ox + 6, 4, 20, 28, '#3a2a1e'); px(c, ox + 8, 6, 16, 22, '#241a12'); px(c, ox + 20, 18, 3, 3, '#c8a868'); return; }
    if (ch === 'S') { px(c, ox + 14, 14, 4, 14, '#7a5230'); px(c, ox + 4, 4, 24, 12, '#a8743c'); px(c, ox + 6, 6, 20, 8, '#8a5c2c'); px(c, ox + 8, 8, 16, 2, '#d8b888'); px(c, ox + 8, 11, 10, 1, '#d8b888'); return; }
    if ('HPMGL'.indexOf(ch) >= 0) { // building roofs/walls
      var col = { H: p.roofH, P: '#e05848', M: '#4878c8', G: '#8a8278', L: '#b89838' }[ch];
      px(c, ox, 0, T, T, col);
      px(c, ox, 0, T, 4, 'rgba(255,255,255,.3)'); px(c, ox, T - 6, T, 6, 'rgba(0,0,0,.28)');
      px(c, ox + 2, 10, 4, 2, 'rgba(0,0,0,.15)'); px(c, ox + 16, 18, 4, 2, 'rgba(0,0,0,.15)');
      return;
    }
  }

  function buildAtlas(theme) {
    var cv = document.createElement('canvas');
    cv.width = CHARS.length * T; cv.height = T * 2;
    var c = cv.getContext('2d');
    var p = THEMES[theme] || THEMES.outdoor;
    var cols = {};
    for (var i = 0; i < CHARS.length; i++) {
      cols[CHARS[i]] = i;
      c.save(); c.translate(0, 0); drawTileInto(c, CHARS[i], p, 0, i * T); c.restore();
      c.save(); c.translate(0, T);
      // frame 2 drawn via translate: draw into temp row
      var tmp = document.createElement('canvas'); tmp.width = T; tmp.height = T;
      var tc = tmp.getContext('2d'); drawTileInto(tc, CHARS[i], p, 1, 0);
      c.drawImage(tmp, i * T, 0); c.restore();
    }
    atlases[theme] = { canvas: cv, cols: cols };
    return atlases[theme];
  }

  /* ------------------------------- actors ------------------------------- */
  // 16x20 pixel maps. H hair S skin T top P pants O shoes E eye A accent
  var BODY = {
    down: [
      '................', '......HHHH......', '.....HHHHHH.....', '....HHHHHHHH....',
      '....HHHHHHHH....', '....HSSSSSSH....', '....SESSSSES....', '....SSSSSSSS....',
      '.....SSSSSS.....', '....TTTTTTTT....', '...TTTTTTTTTT...', '..STTTTTTTTTTS..',
      '..STTTTTTTTTTS..', '....TTTTTTTT....', '....PPPPPPPP....', '....PPPPPPPP....',
      '....PP....PP....', '....PP....PP....', '...OOO....OOO...', '................'],
    down2: [
      '................', '......HHHH......', '.....HHHHHH.....', '....HHHHHHHH....',
      '....HHHHHHHH....', '....HSSSSSSH....', '....SESSSSES....', '....SSSSSSSS....',
      '.....SSSSSS.....', '....TTTTTTTT....', '...TTTTTTTTTT...', '..STTTTTTTTTTS..',
      '..STTTTTTTTTTS..', '....TTTTTTTT....', '....PPPPPPPP....', '....PPPPPPP.....',
      '...PPP...PPP....', '...PP.....PP....', '..OOO.....OOO...', '................'],
    up: [
      '................', '......HHHH......', '.....HHHHHH.....', '....HHHHHHHH....',
      '....HHHHHHHH....', '....HHHHHHHH....', '....HHHHHHHH....', '....SHHHHHHS....',
      '.....SHHHHS.....', '....TTTTTTTT....', '...TTTTTTTTTT...', '..STTAAAAAATTS..',
      '..STTAAAAAATTS..', '....TTTTTTTT....', '....PPPPPPPP....', '....PPPPPPPP....',
      '....PP....PP....', '....PP....PP....', '...OOO....OOO...', '................'],
    up2: [
      '................', '......HHHH......', '.....HHHHHH.....', '....HHHHHHHH....',
      '....HHHHHHHH....', '....HHHHHHHH....', '....HHHHHHHH....', '....SHHHHHHS....',
      '.....SHHHHS.....', '....TTTTTTTT....', '...TTTTTTTTTT...', '..STTAAAAAATTS..',
      '..STTAAAAAATTS..', '....TTTTTTTT....', '....PPPPPPPP....', '.....PPPPPPP....',
      '....PPP...PPP...', '....PP.....PP...', '....OOO...OOO...', '................'],
    left: [
      '................', '......HHHH......', '.....HHHHHH.....', '....HHHHHHHH....',
      '....HHHHHHHH....', '....SSSSHHHH....', '....SESSHHHH....', '....SSSSSHHH....',
      '.....SSSSS......', '....TTTTTTTT....', '....TTTTTTTT....', '....STTTTTTT....',
      '....STTTTTTT....', '....TTTTTTTT....', '....PPPPPPPP....', '....PPPPPPPP....',
      '.....PPPP.......', '.....PP.PP......', '....OOO.OOO.....', '................'],
    left2: [
      '................', '......HHHH......', '.....HHHHHH.....', '....HHHHHHHH....',
      '....HHHHHHHH....', '....SSSSHHHH....', '....SESSHHHH....', '....SSSSSHHH....',
      '.....SSSSS......', '....TTTTTTTT....', '....TTTTTTTT....', '....STTTTTTT....',
      '....STTTTTTT....', '....TTTTTTTT....', '....PPPPPPPP....', '....PPPPPP......',
      '....PPP..PP.....', '...OPP....PP....', '...OOO...OOO....', '................']
  };
  var HAT = ['......AAAA......', '.....AAAAAA.....', '....AAAAAAAA....', '...AAAAAAAAAA...'];

  var ACTORS = {
    player:    { skin: '#f0c8a0', hair: '#3a3a4a', top: '#d83838', pants: '#3858a0', shoe: '#2a2a30', hat: '#d83838' },
    playerF:   { skin: '#f0c8a0', hair: '#d8a040', top: '#e86888', pants: '#404858', shoe: '#2a2a30', hat: '#f0f0f0' },
    rival:     { skin: '#f0c8a0', hair: '#e8b830', top: '#e87830', pants: '#787878', shoe: '#5a4a3a' },
    prof:      { skin: '#e8c098', hair: '#c8c8c8', top: '#8a6848', pants: '#4a4a52', shoe: '#3a3030' },
    mom:       { skin: '#f0c8a0', hair: '#a87038', top: '#e8b848', pants: '#b85858', shoe: '#7a4a3a' },
    nurse:     { skin: '#f8d8b8', hair: '#e88aa8', top: '#f8f0f0', pants: '#f8f0f0', shoe: '#d87888' },
    clerk:     { skin: '#e8c098', hair: '#5a4a3a', top: '#4878c8', pants: '#38486a', shoe: '#2a2a30' },
    youngster: { skin: '#f0c8a0', hair: '#4a3a2a', top: '#f8f8f8', pants: '#3858a0', shoe: '#3a3a40', hat: '#d83838' },
    lass:      { skin: '#f8d8b8', hair: '#c87838', top: '#f8c8d8', pants: '#5878b8', shoe: '#8a5a4a' },
    hiker:     { skin: '#d8a878', hair: '#4a3a2a', top: '#8a9a48', pants: '#6a5a3a', shoe: '#4a3a2a' },
    ace:       { skin: '#f0c8a0', hair: '#3a3a4a', top: '#384878', pants: '#2a2a30', shoe: '#2a2a30' },
    fisher:    { skin: '#e8b888', hair: '#6a5a4a', top: '#5888a8', pants: '#3a4a3a', shoe: '#3a3a30', hat: '#e8e0c0' },
    swimmer:   { skin: '#e8b080', hair: '#3858a0', top: '#e85838', pants: '#e85838', shoe: '#e8b080' },
    grunt:     { skin: '#e8c8a8', hair: '#48c8c8', top: '#3a3a4a', pants: '#3a3a4a', shoe: '#5a5a6a' },
    commander: { skin: '#f0c8a0', hair: '#e84858', top: '#2a2a38', pants: '#2a2a38', shoe: '#4a4a5a' },
    boss:      { skin: '#e8c8a8', hair: '#5ab8c8', top: '#28283a', pants: '#28283a', shoe: '#1a1a24' },
    cynthia:   { skin: '#f8d8b8', hair: '#e8d878', top: '#2a2a30', pants: '#2a2a30', shoe: '#1a1a20' },
    elder:     { skin: '#e0b890', hair: '#d8d8d8', top: '#7a5a8a', pants: '#5a4a6a', shoe: '#3a3030' },
    scientist: { skin: '#e8c098', hair: '#3a3a3a', top: '#e8e8f0', pants: '#4a4a52', shoe: '#2a2a30' },
    leader:    { skin: '#e8c098', hair: '#8a3828', top: '#a83828', pants: '#3a3a40', shoe: '#2a2a30' },
    looker:    { skin: '#e8c098', hair: '#2a2a2a', top: '#6a5a48', pants: '#3a3a40', shoe: '#2a2a30' },
    sailor:    { skin: '#e0a878', hair: '#2a2a2a', top: '#f0f0f8', pants: '#3858a0', shoe: '#2a2a30', hat: '#f0f0f8' },
    skier:     { skin: '#f0c8a0', hair: '#c8d8e8', top: '#5878c8', pants: '#e8e8f0', shoe: '#3a3a40', hat: '#5878c8' }
  };

  function drawActorFrame(ctx, pal, dir, step, dx, dy, flip) {
    var key = dir + (step ? '2' : '');
    var rows = BODY[key] || BODY.down;
    var cols = { H: pal.hair, S: pal.skin, T: pal.top, P: pal.pants, O: pal.shoe, E: '#202028', A: pal.bag || '#c8a040' };
    ctx.save();
    ctx.translate(dx, dy);
    if (flip) { ctx.translate(32, 0); ctx.scale(-1, 1); }
    for (var y = 0; y < rows.length; y++) {
      var row = rows[y];
      if (pal.hat && y < 4 && row.indexOf('H') >= 0) row = HAT[y - 1] || row;
      for (var x = 0; x < 16; x++) {
        var ch = row[x];
        if (ch === '.' ) continue;
        ctx.fillStyle = ch === 'A' && pal.hat && y < 5 ? pal.hat : cols[ch] || pal.top;
        ctx.fillRect(x * 2, y * 2, 2, 2);
      }
    }
    ctx.restore();
  }

  return {
    T: T, THEMES: THEMES, ACTORS: ACTORS,
    init: function () { for (var th in THEMES) buildAtlas(th); },
    frame: 0,
    tick: function (t) { this.frame = Math.floor(t * 2) % 2; },
    drawTile: function (ctx, theme, ch, dx, dy, animFrame) {
      var a = atlases[theme] || buildAtlas(theme);
      var col = a.cols[ch];
      if (col === undefined) col = a.cols['.'];
      var f = (animFrame === undefined ? this.frame : animFrame);
      if ('~sW*,'.indexOf(ch) < 0) f = 0;
      ctx.drawImage(a.canvas, col * T, f * T, T, T, dx, dy, T, T);
    },
    drawActor: function (ctx, actorId, dir, step, px, py, opts) {
      var pal = ACTORS[actorId] || ACTORS.ace;
      opts = opts || {};
      var flip = dir === 'right';
      var d = dir === 'right' ? 'left' : dir;
      if (opts.surfing) {
        ctx.fillStyle = 'rgba(0,20,60,.25)'; ctx.beginPath(); ctx.ellipse(px + 16, py + 26, 15, 7, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#4868c8'; ctx.beginPath(); ctx.ellipse(px + 16, py + 22, 14, 8, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#6888e0'; ctx.beginPath(); ctx.ellipse(px + 16, py + 19, 11, 5, 0, 0, 7); ctx.fill();
        drawActorFrame(ctx, pal, d, step, px, py - 14, flip);
        return;
      }
      drawActorFrame(ctx, pal, d, step, px, py - 8, flip);
    },
    drawBall: function (ctx, px, py) {
      ctx.fillStyle = '#e84848'; ctx.beginPath(); ctx.arc(px + 16, py + 18, 8, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#f0f0f0'; ctx.beginPath(); ctx.arc(px + 16, py + 18, 8, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#202028'; ctx.fillRect(px + 8, py + 17, 16, 3);
      ctx.fillStyle = '#f0f0f0'; ctx.beginPath(); ctx.arc(px + 16, py + 18, 3, 0, 7); ctx.fill();
    },
    grassOverlay: function (ctx, theme, dx, dy) {
      var p = THEMES[theme] || THEMES.outdoor;
      ctx.fillStyle = p.grass2;
      for (var i = 0; i < 5; i++) {
        ctx.beginPath(); ctx.moveTo(dx + 2 + i * 6, 32 + dy); ctx.lineTo(dx + 5 + i * 6, dy + 20); ctx.lineTo(dx + 8 + i * 6, dy + 32); ctx.fill();
      }
    },
    /* --------------------------------- UI --------------------------------- */
    text: function (ctx, str, x, y, o) {
      o = o || {};
      ctx.font = (o.bold ? '700 ' : '') + (o.size || 17) + 'px Consolas, "Courier New", monospace';
      ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.baseline || 'top';
      if (o.shadow !== false) { ctx.fillStyle = o.shadowColor || 'rgba(20,20,30,.55)'; ctx.fillText(str, x + 2, y + 2); }
      ctx.fillStyle = o.color || '#f8f8f8'; ctx.fillText(str, x, y);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    },
    panel: function (ctx, x, y, w, h, style) {
      ctx.save();
      var grad = ctx.createLinearGradient(0, y, 0, y + h);
      if (style === 'light') { grad.addColorStop(0, '#f8f8f0'); grad.addColorStop(1, '#e0e0d8'); }
      else { grad.addColorStop(0, '#2c3450'); grad.addColorStop(1, '#1c2438'); }
      ctx.fillStyle = grad;
      ctx.strokeStyle = style === 'light' ? '#787058' : '#8aa0d8';
      ctx.lineWidth = 3;
      var r = 8;
      ctx.beginPath(); ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = style === 'light' ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.18)';
      ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
    },
    hpBar: function (ctx, x, y, w, cur, max) {
      var pct = max > 0 ? cur / max : 0;
      ctx.fillStyle = '#30303a'; ctx.fillRect(x - 1, y - 1, w + 2, 8);
      ctx.fillStyle = '#585860'; ctx.fillRect(x, y, w, 6);
      ctx.fillStyle = pct > .5 ? '#58d058' : pct > .2 ? '#e8c030' : '#e85040';
      ctx.fillRect(x, y, Math.max(0, Math.round(w * pct)), 6);
    },
    expBar: function (ctx, x, y, w, pct) {
      ctx.fillStyle = '#30303a'; ctx.fillRect(x - 1, y - 1, w + 2, 5);
      ctx.fillStyle = '#48a8e8'; ctx.fillRect(x, y, Math.round(w * PKM.U.clamp(pct, 0, 1)), 3);
    },
    typeBadge: function (ctx, type, x, y) {
      ctx.fillStyle = PKM.TYPE_COLORS[type] || '#888';
      ctx.fillRect(x, y, 64, 16);
      ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.strokeRect(x + .5, y + .5, 63, 15);
      this.text(ctx, type.toUpperCase(), x + 32, y + 1, { size: 12, align: 'center', color: '#fff', bold: true });
    },
    cursor: function (ctx, x, y, color) {
      ctx.fillStyle = color || '#f8f8f8';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 10, y + 6); ctx.lineTo(x, y + 12); ctx.fill();
    },
    dim: function (ctx, alpha) {
      ctx.fillStyle = 'rgba(8,10,16,' + alpha + ')';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
  };
})();
