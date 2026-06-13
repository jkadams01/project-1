/* Small shared helpers. */
PKM.U = {
  ri: function (a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }, // inclusive
  chance: function (pct) { return Math.random() * 100 < pct; },
  pick: function (arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  pickW: function (arr) { // arr of [item, weight]
    var tot = 0, i;
    for (i = 0; i < arr.length; i++) tot += arr[i][1];
    var r = Math.random() * tot;
    for (i = 0; i < arr.length; i++) { r -= arr[i][1]; if (r < 0) return arr[i][0]; }
    return arr[arr.length - 1][0];
  },
  clamp: function (v, a, b) { return v < a ? a : (v > b ? b : v); },
  cap: function (s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; },
  title: function (ident) { // kebab-ident -> Title Case
    return String(ident).split('-').map(this.cap).join(' ');
  },
  fmtMoney: function (n) { return '$' + n.toLocaleString('en-US'); },
  pad: function (n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; },
  deep: function (o) { return JSON.parse(JSON.stringify(o)); },
  wrap: function (ctx, text, maxW) { // -> array of lines
    var words = String(text).split(' '), lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var t = cur ? cur + ' ' + words[i] : words[i];
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = words[i]; }
      else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  },
  DIRS: { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] },
  opposite: { up: 'down', down: 'up', left: 'right', right: 'left' },
  isDay: function () { var h = new Date().getHours(); return h >= 6 && h < 19; },
  timeWord: function () {
    var h = new Date().getHours();
    if (h >= 6 && h < 10) return 'morning';
    if (h >= 10 && h < 17) return 'day';
    if (h >= 17 && h < 20) return 'dusk';
    return 'night';
  }
};
