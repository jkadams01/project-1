/* Boot + scene stack + main loop. */
PKM.Scenes = {
  stack: [],
  push: function (s) { this.stack.push(s); },
  pop: function (s) {
    if (s) {
      var i = this.stack.indexOf(s);
      if (i >= 0) this.stack.splice(i, 1);
    } else this.stack.pop();
  },
  replaceAll: function (s) { this.stack = [s]; },
  top: function () { return this.stack[this.stack.length - 1]; },
  update: function (dt) {
    var t = this.top();
    if (t && t.update) t.update(dt);
  },
  draw: function (ctx) {
    // draw from the lowest non-overlay scene upward
    var start = this.stack.length - 1;
    while (start > 0 && this.stack[start].overlay) start--;
    for (var i = start; i < this.stack.length; i++)
      if (this.stack[i].draw) this.stack[i].draw(ctx);
  }
};

PKM.fastMode = false;

(function () {
  function boot() {
    PKM.initData();
    PKM.GFX.init();
    PKM.Input.init();
    var canvas = document.getElementById('game');
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    PKM.Scenes.push(PKM.Title.scene());

    var last = performance.now();
    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      PKM.Input.update(dt);
      PKM.Scenes.update(dt);
      if (PKM.G) PKM.G.playSec += dt;
      ctx.imageSmoothingEnabled = false;
      PKM.Scenes.draw(ctx);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
