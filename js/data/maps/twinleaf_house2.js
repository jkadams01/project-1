PKM.registerMap('twinleaf_house2', {
  "name": "Lakeside Cottage", "theme": "indoor", "music": "town", "indoor": true,
  "tiles": [
    "##########",
    "#o......o#",
    "#........#",
    "#........#",
    "#........#",
    "#........#",
    "#####D####"
  ],
  "warps": [{ "x": 5, "y": 6, "to": "twinleaf", "tx": 12, "ty": 13, "dir": "down" }],
  "signs": [],
  "npcs": [
    { "id": "elder", "x": 3, "y": 3, "sprite": "elder", "dir": "down", "move": "static", "text": "generic_elder" }
  ]
});
