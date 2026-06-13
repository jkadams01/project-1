/* Pokemon battle/menu sprites: loads 96x96 PNGs from the public PokeAPI sprite
   CDN at runtime (personal/fan use); falls back to procedural creatures so the
   game is fully playable offline. */
PKM.Sprites = (function () {
  var BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
  var cache = {};

  function url(id, kind) {
    if (kind === 'back') return BASE + 'back/' + id + '.png';
    return BASE + id + '.png';
  }

  function get(id, kind) {
    var key = id + ':' + (kind === 'back' ? 'back' : 'front');
    var e = cache[key];
    if (e) return e;
    e = cache[key] = { ok: false, failed: false, img: new Image() };
    e.img.crossOrigin = 'anonymous';
    e.img.onload = function () { e.ok = true; };
    e.img.onerror = function () {
      if (kind === 'back' && !e.retried) { e.retried = true; e.img.src = url(id, 'front'); }
      else e.failed = true;
    };
    e.img.src = url(id, kind);
    return e;
  }

  /* deterministic per-id pseudo-random */
  function h(id, n) { var x = Math.sin(id * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); }

  function fallback(ctx, id, x, y, size, back) {
    var sp = PKM.species(id);
    var c1 = PKM.TYPE_COLORS[(sp && sp.types[0]) || 'normal'];
    var c2 = sp && sp.types[1] ? PKM.TYPE_COLORS[sp.types[1]] : c1;
    var cx = x + size / 2, cy = y + size * 0.62, r = size * (0.26 + h(id, 1) * 0.1);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.2)';
    ctx.beginPath(); ctx.ellipse(cx, y + size * 0.88, r * 1.1, r * 0.3, 0, 0, 7); ctx.fill();
    // body
    ctx.fillStyle = c1;
    ctx.beginPath(); ctx.ellipse(cx, cy, r * (1 + h(id, 2) * .3), r, 0, 0, 7); ctx.fill();
    // head
    var hy = cy - r * (0.8 + h(id, 3) * .4), hr = r * (0.55 + h(id, 4) * .25);
    ctx.beginPath(); ctx.arc(cx, hy, hr, 0, 7); ctx.fill();
    // ears / horns
    if (h(id, 5) > 0.4) {
      ctx.beginPath(); ctx.moveTo(cx - hr * .7, hy - hr * .4); ctx.lineTo(cx - hr * .4, hy - hr * 1.6); ctx.lineTo(cx - hr * .1, hy - hr * .6); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx + hr * .7, hy - hr * .4); ctx.lineTo(cx + hr * .4, hy - hr * 1.6); ctx.lineTo(cx + hr * .1, hy - hr * .6); ctx.fill();
    }
    // belly / markings
    ctx.fillStyle = c2; ctx.globalAlpha = .75;
    ctx.beginPath(); ctx.ellipse(cx, cy + r * .15, r * .55, r * .6, 0, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
    if (!back) { // face
      ctx.fillStyle = '#202028';
      ctx.beginPath(); ctx.arc(cx - hr * .35, hy, hr * .14, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + hr * .35, hy, hr * .14, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(cx - hr * .32, hy - hr * .05, hr * .05, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + hr * .38, hy - hr * .05, hr * .05, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  return {
    preload: function (id) { get(id, 'front'); get(id, 'back'); },
    /* draw sprite; size = square box. Returns true if real art drawn. */
    draw: function (ctx, id, kind, x, y, size) {
      var e = get(id, kind);
      if (e.ok) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(e.img, x, y, size, size);
        return true;
      }
      fallback(ctx, id, x, y, size, kind === 'back');
      return false;
    },
    icon: function (ctx, id, x, y, size) { this.draw(ctx, id, 'front', x, y, size || 40); }
  };
})();
