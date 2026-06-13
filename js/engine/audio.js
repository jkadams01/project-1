/* WebAudio chiptune: tiny pattern sequencer with original loops + synth SFX. */
PKM.Audio = (function () {
  var ctx = null, master = null, musicGain = null, muted = false;
  var current = null, timer = null, pos = 0, nextTime = 0;

  function ac() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = 0.55; musicGain.connect(master);
    }
    return ctx;
  }

  var N = {};
  (function () { // note name -> freq
    var names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    for (var o = 1; o <= 7; o++) for (var i = 0; i < 12; i++)
      N[names[i] + o] = 440 * Math.pow(2, (o * 12 + i - 57) / 12);
  })();

  /* tracks: { bpm, sq: [...], sq2: [...], tri: [...] } each entry [note|0, beats] */
  var TRACKS = {
    title: { bpm: 96, sq: [['D4',1],['F#4',1],['A4',1],['D5',2],['C#5',.5],['B4',.5],['A4',1],['F#4',1],['G4',1],['A4',1],['B4',2],['A4',2],['D4',1],['F#4',1],['A4',1],['D5',2],['E5',.5],['F#5',.5],['E5',1],['C#5',1],['D5',3],[0,1]], tri: [['D2',2],['A2',2],['B2',2],['F#2',2],['G2',2],['D2',2],['A2',2],['A2',2],['D2',2],['A2',2],['B2',2],['F#2',2],['G2',2],['A2',2],['D2',4]] },
    town: { bpm: 100, sq: [['G4',1],['B4',1],['D5',1.5],['B4',.5],['C5',1],['B4',1],['A4',2],['F#4',1],['A4',1],['C5',1.5],['A4',.5],['B4',1],['A4',1],['G4',2],['E4',1],['G4',1],['B4',1.5],['G4',.5],['A4',1],['B4',1],['C5',2],['D5',1],['B4',1],['A4',1],['F#4',1],['G4',4]], tri: [['G2',2],['D2',2],['C2',2],['D2',2],['E2',2],['C2',2],['D2',2],['D2',2],['C2',2],['B1',2],['C2',2],['D2',2],['G2',4]] },
    route: { bpm: 124, sq: [['E4',.5],['G4',.5],['A4',1],['B4',1],['G4',1],['A4',1.5],['B4',.5],['C5',1],['B4',1],['A4',1],['G4',1],['E4',2],['E4',.5],['G4',.5],['A4',1],['B4',1],['D5',1],['C5',1.5],['B4',.5],['A4',1],['B4',1],['G4',1],['A4',1],['E4',2]], tri: [['E2',1],['B2',1],['E2',1],['B2',1],['C2',1],['G2',1],['C2',1],['G2',1],['A1',1],['E2',1],['A1',1],['E2',1],['B1',1],['F#2',1],['B1',1],['F#2',1]] },
    battle: { bpm: 150, sq: [['A4',.5],['A4',.5],['C5',.5],['A4',.5],['D5',.5],['C5',.5],['E5',1],['F5',.5],['E5',.5],['D5',.5],['C5',.5],['B4',1],['E4',1],['A4',.5],['A4',.5],['C5',.5],['A4',.5],['G5',.5],['F5',.5],['E5',1],['D5',.5],['E5',.5],['F5',.5],['D5',.5],['E5',2]], tri: [['A1',.5],['A1',.5],['A2',.5],['A1',.5],['A1',.5],['A2',.5],['A1',.5],['A2',.5],['F1',.5],['F1',.5],['F2',.5],['F1',.5],['G1',.5],['G1',.5],['G2',.5],['G1',.5],['A1',.5],['A1',.5],['A2',.5],['A1',.5],['A1',.5],['A2',.5],['A1',.5],['A2',.5],['F1',.5],['F2',.5],['F1',.5],['F2',.5],['E1',.5],['E2',.5],['E1',.5],['E2',.5]] },
    leader: { bpm: 160, sq: [['D5',.5],['D5',.5],['D5',.5],['C5',.5],['D5',1],['F5',1],['E5',.5],['D5',.5],['C5',.5],['D5',.5],['E5',1.5],['A4',.5],['C5',.5],['D5',.5],['E5',.5],['F5',.5],['G5',1],['A5',1],['G5',.5],['F5',.5],['E5',.5],['C5',.5],['D5',2]], tri: [['D2',.5],['D2',.5],['D3',.5],['D2',.5],['D2',.5],['D3',.5],['D2',.5],['D3',.5],['B1',.5],['B1',.5],['B2',.5],['B1',.5],['C2',.5],['C2',.5],['C3',.5],['C2',.5],['D2',.5],['D3',.5],['D2',.5],['D3',.5],['B1',.5],['B2',.5],['C2',.5],['C3',.5],['D2',.5],['D3',.5],['D2',.5],['D3',.5],['D2',1]] },
    center: { bpm: 104, sq: [['C5',1],['G4',1],['E4',1],['G4',1],['A4',1],['G4',1],['F4',1],['E4',1],['D4',1],['F4',1],['A4',1],['C5',1],['B4',2],['G4',2]], tri: [['C3',2],['E3',2],['F3',2],['C3',2],['D3',2],['F3',2],['G3',2],['G2',2]] },
    cave: { bpm: 92, sq: [['D4',1],[0,.5],['F4',.5],['D4',1],['G#4',1],['G4',1],[0,1],['D4',1],[0,.5],['F4',.5],['A4',1],['G#4',1],['F4',1],[0,1]], tri: [['D2',2],['D2',2],['C#2',2],['C2',2],['D2',2],['D2',2],['F2',2],['E2',2]] },
    galactic: { bpm: 138, sq: [['B4',.5],['B4',.5],[0,.5],['B4',.5],['D5',.5],['C#5',.5],[0,.5],['A4',.5],['B4',.5],['B4',.5],[0,.5],['F#5',.5],['E5',.5],['D5',.5],['C#5',.5],['A4',.5]], tri: [['B1',.5],['B1',.5],['B2',.5],['B1',.5],['G1',.5],['G1',.5],['G2',.5],['G1',.5],['A1',.5],['A1',.5],['A2',.5],['A1',.5],['F#1',.5],['F#1',.5],['F#2',.5],['F#1',.5]] },
    snow: { bpm: 88, sq: [['A4',1.5],['E5',.5],['C#5',1],['B4',1],['A4',1.5],['F#4',.5],['G#4',1],['E4',1],['F#4',1.5],['A4',.5],['C#5',1],['E5',1],['D#5',1],['B4',1],['B4',2]], tri: [['A2',2],['E2',2],['F#2',2],['C#2',2],['D2',2],['A1',2],['B1',2],['E2',2]] },
    league: { bpm: 132, sq: [['C5',1],['E5',1],['G5',1.5],['E5',.5],['F5',1],['E5',1],['D5',2],['B4',1],['D5',1],['F5',1.5],['D5',.5],['E5',1],['D5',1],['C5',2]], tri: [['C2',1],['G2',1],['C2',1],['G2',1],['F1',1],['C2',1],['G1',1],['G2',1],['C2',1],['G2',1],['C2',1],['G2',1],['F1',1],['G1',1],['C2',2]] },
    distortion: { bpm: 80, sq: [['C#5',1],[0,.5],['C5',.5],['F#4',1],['G4',1],[0,1],['A#4',1],['B4',1],['F#4',1],[0,1],['C#5',.5],['D5',.5],['C#5',1],['G#4',2]], tri: [['C#2',2],['C2',2],['B1',2],['A#1',2],['F#1',2],['G1',2],['G#1',2],['G#1',2]] },
    champion: { bpm: 168, sq: [['E5',.5],['E5',.5],['E5',.5],['D#5',.5],['E5',1],['G5',1],['F#5',.5],['E5',.5],['D#5',.5],['E5',.5],['F#5',1.5],['B4',.5],['E5',.5],['F#5',.5],['G5',.5],['A5',.5],['B5',1],['A5',.5],['G5',.5],['F#5',.5],['E5',.5],['D#5',.5],['F#5',.5],['E5',2]], tri: [['E2',.5],['E3',.5],['E2',.5],['E3',.5],['C2',.5],['C3',.5],['C2',.5],['C3',.5],['D2',.5],['D3',.5],['D2',.5],['D3',.5],['B1',.5],['B2',.5],['B1',.5],['B2',.5],['E2',.5],['E3',.5],['C2',.5],['C3',.5],['D2',.5],['D3',.5],['B1',.5],['B2',.5],['E2',.5],['E3',.5],['E2',.5],['E3',.5],['E2',1]] },
    surf: { bpm: 112, sq: [['G4',1],['B4',1],['D5',1.5],['E5',.5],['D5',1],['B4',1],['C5',2],['A4',1],['C5',1],['E5',1.5],['F5',.5],['E5',1],['C5',1],['D5',2]], tri: [['G2',2],['D2',2],['E2',2],['B1',2],['C2',2],['G1',2],['D2',2],['D2',2]] }
  };

  function scheduleNote(ch, freq, t, dur) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = ch; o.frequency.value = freq;
    g.gain.setValueAtTime(ch === 'triangle' ? .30 : .14, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.95);
    o.connect(g); g.connect(musicGain);
    o.start(t); o.stop(t + dur);
  }

  function flatten(track) {
    var beat = 60 / track.bpm, evs = [], chans = { sq: 'square', sq2: 'square', tri: 'triangle' }, len = 0;
    for (var k in chans) {
      var arr = track[k]; if (!arr) continue;
      var t = 0;
      for (var i = 0; i < arr.length; i++) {
        var note = arr[i][0], dur = arr[i][1] * beat;
        if (note) evs.push({ t: t, f: N[note], d: dur, ch: chans[k] });
        t += dur;
      }
      len = Math.max(len, t);
    }
    evs.sort(function (a, b) { return a.t - b.t; });
    return { evs: evs, len: len };
  }

  function pump() {
    if (!current || muted) return;
    var ahead = ctx.currentTime + 0.35;
    while (nextTime < ahead) {
      for (var i = 0; i < current.evs.length; i++) {
        var e = current.evs[i];
        scheduleNote(e.ch, e.f, nextTime + e.t, e.d);
      }
      nextTime += current.len;
    }
  }

  function sfxOsc(type, f0, f1, dur, vol, delay) {
    var t = ac().currentTime + (delay || 0);
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol || .25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .02);
  }
  function noise(dur, vol, delay) {
    var t = ac().currentTime + (delay || 0);
    var buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource(); src.buffer = buf;
    var g = ctx.createGain(); g.gain.setValueAtTime(vol || .2, t);
    g.gain.exponentialRampToValueAtTime(.001, t + dur);
    src.connect(g); g.connect(master); src.start(t);
  }

  var SFX = {
    select: function () { sfxOsc('square', 880, 0, .06, .12); },
    confirm: function () { sfxOsc('square', 660, 990, .09, .15); },
    cancel: function () { sfxOsc('square', 440, 220, .09, .15); },
    bump: function () { sfxOsc('triangle', 120, 80, .08, .3); },
    door: function () { sfxOsc('triangle', 300, 500, .12, .2); },
    jump: function () { sfxOsc('square', 300, 600, .15, .12); },
    encounter: function () { sfxOsc('sawtooth', 200, 900, .35, .18); sfxOsc('sawtooth', 180, 60, .4, .15, .05); },
    hit: function () { noise(.12, .3); sfxOsc('square', 220, 110, .1, .2); },
    superhit: function () { noise(.2, .4); sfxOsc('square', 380, 80, .2, .3); },
    weakhit: function () { noise(.08, .15); },
    faint: function () { sfxOsc('square', 500, 60, .5, .25); },
    ballthrow: function () { sfxOsc('square', 400, 900, .18, .15); },
    ballshake: function () { sfxOsc('triangle', 200, 150, .1, .3); },
    catch: function () { sfxOsc('square', 523, 0, .12, .2); sfxOsc('square', 659, 0, .12, .2, .13); sfxOsc('square', 784, 0, .25, .2, .26); },
    levelup: function () { var n = [523, 659, 784, 1047]; for (var i = 0; i < 4; i++) sfxOsc('square', n[i], 0, .12, .18, i * .09); },
    heal: function () { var n = [659, 784, 988, 1319]; for (var i = 0; i < 4; i++) sfxOsc('triangle', n[i], 0, .15, .25, i * .11); },
    save: function () { sfxOsc('square', 784, 0, .1, .15); sfxOsc('square', 784, 0, .1, .15, .15); },
    badge: function () { var n = [587, 740, 880, 1175, 880, 1175]; for (var i = 0; i < n.length; i++) sfxOsc('square', n[i], 0, .14, .2, i * .1); },
    buy: function () { sfxOsc('square', 988, 0, .07, .15); sfxOsc('square', 1319, 0, .12, .15, .08); },
    evolve: function () { for (var i = 0; i < 8; i++) sfxOsc('square', 400 + i * 120, 0, .1, .12, i * .07); }
  };

  return {
    unlock: function () { var c = ac(); if (c.state === 'suspended') c.resume(); },
    play: function (name) {
      if (current && current.name === name) return;
      ac();
      current = flatten(TRACKS[name] || TRACKS.route);
      current.name = name;
      nextTime = ctx.currentTime + 0.05;
      if (!timer) timer = setInterval(pump, 100);
      pump();
    },
    stop: function () { current = null; },
    sfx: function (name) { if (muted) return; ac(); if (SFX[name]) SFX[name](); },
    toggleMute: function () {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      if (!muted && current) { nextTime = ctx.currentTime + .05; }
      return muted;
    },
    isMuted: function () { return muted; }
  };
})();
