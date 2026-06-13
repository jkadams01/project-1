PKM.registerMap('twinleaf_rival_home', {
  "name": "{RIVAL}'s House", "theme": "indoor", "music": "town", "indoor": true,
  "tiles": [
    "############",
    "#o..S....o.#",
    "#..........#",
    "#..........#",
    "#..........#",
    "#..........#",
    "#..........#",
    "#..........#",
    "######D#####"
  ],
  "warps": [{ "x": 6, "y": 8, "to": "twinleaf", "tx": 14, "ty": 5, "dir": "down" }],
  "signs": [{ "x": 4, "y": 1, "text": "A note: 'Fine me a million dollars if I'm late!' It's signed by the boy who lives here." }],
  "npcs": [
    { "id": "rivalmom", "x": 4, "y": 4, "sprite": "lass", "dir": "down", "move": "static", "text": "Oh, hello dear. My son? He tore out of here like a hurricane. Honestly, that boy..." }
  ]
});
