/* Keyboard input: held state + consumable taps with menu auto-repeat. */
PKM.Input = (function () {
  var MAP = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    KeyZ: 'a', Space: 'a', KeyX: 'b', ShiftLeft: 'b', ShiftRight: 'b',
    Enter: 'start', Escape: 'start', KeyM: 'mute', Backquote: 'speed'
  };
  var heldKeys = {}, taps = {}, heldTime = {}, repeatAt = {};

  function onDown(e) {
    var b = MAP[e.code];
    if (!b) return;
    e.preventDefault();
    if (!heldKeys[b]) { taps[b] = true; heldTime[b] = 0; repeatAt[b] = 0.4; }
    heldKeys[b] = true;
    if (PKM.Audio) PKM.Audio.unlock();
    if (b === 'mute' && PKM.Audio) PKM.Audio.toggleMute();
    if (b === 'speed') PKM.fastMode = !PKM.fastMode;
  }
  function onUp(e) {
    var b = MAP[e.code];
    if (b) { heldKeys[b] = false; heldTime[b] = 0; }
  }

  return {
    init: function () {
      window.addEventListener('keydown', onDown);
      window.addEventListener('keyup', onUp);
    },
    update: function (dt) {
      for (var b in heldKeys) if (heldKeys[b]) heldTime[b] = (heldTime[b] || 0) + dt;
    },
    held: function (b) { return !!heldKeys[b]; },
    heldDir: function () {
      var order = ['up', 'down', 'left', 'right'];
      for (var i = 0; i < order.length; i++) if (heldKeys[order[i]]) return order[i];
      return null;
    },
    take: function (b) { if (taps[b]) { taps[b] = false; return true; } return false; },
    /* For menus: returns dir on initial tap then auto-repeats while held. */
    menuDir: function () {
      var dirs = ['up', 'down', 'left', 'right'];
      for (var i = 0; i < dirs.length; i++) {
        var d = dirs[i];
        if (taps[d]) { taps[d] = false; return d; }
        if (heldKeys[d] && heldTime[d] > repeatAt[d]) { repeatAt[d] += 0.12; return d; }
      }
      return null;
    },
    clear: function () { taps = {}; }
  };
})();
