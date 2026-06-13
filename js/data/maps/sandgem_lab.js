PKM.registerMap('sandgem_lab', {
  "name": "Pokemon Research Lab", "theme": "indoor", "music": "center", "indoor": true,
  "tiles": [
    "################",
    "#o.....oo.....o#",
    "#..............#",
    "#..S...........#",
    "#..............#",
    "#..............#",
    "#..............#",
    "#..............#",
    "#..............#",
    "#..............#",
    "#######D########"
  ],
  "warps": [{ "x": 7, "y": 10, "to": "sandgem", "tx": 5, "ty": 5, "dir": "down" }],
  "signs": [{ "x": 3, "y": 3, "text": "Field notes, vol. 209: 'Regional variants confirm it — environment shapes evolution itself.'" }],
  "npcs": [
    { "id": "rowan", "x": 7, "y": 3, "sprite": "prof", "dir": "down", "move": "static", "script": "rowan_lab" },
    { "id": "aide2", "x": 3, "y": 6, "sprite": "scientist", "dir": "down", "move": "wander", "text": "The Professor's Pokedex syncs with researchers worldwide. All 1,025 known species, one little device!" }
  ]
});
