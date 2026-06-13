PKM.registerMap('sandgem', {
  "name": "Sandgem Town", "theme": "outdoor", "music": "town", "town": "sandgem",
  "tiles": [
    "##########..################",
    "#..........................#",
    "#..HHHHH.....PPPP....MMMM..#",
    "#..HHHHH.....PPPP....MMMM..#",
    "#..HHDHH.....PDPP....MDMM..#",
    "#..........................#",
    "....=================......#",
    "...........................#",
    "...........................#",
    "#..........................#",
    "#..S.......................#",
    "#..HHHH.........HHHH.......#",
    "#..HHHH.........HHHH.......#",
    "#..HDHH.........HDHH.......#",
    "#..........................#",
    "#,,,,,,........ss~~~~~~....#",
    "#,,,,,,.......ss~~~~~~~....#",
    "############################"
  ],
  "connections": {
    "left": { "to": "route201", "offset": 0 },
    "up": { "to": "route202", "offset": 2 }
  },
  "warps": [
    { "x": 5, "y": 4, "to": "sandgem_lab", "tx": 7, "ty": 9, "dir": "up" },
    { "x": 14, "y": 4, "to": "sandgem_center", "tx": 7, "ty": 6, "dir": "up" },
    { "x": 22, "y": 4, "to": "sandgem_mart", "tx": 6, "ty": 7, "dir": "up" },
    { "x": 4, "y": 13, "to": "twinleaf_house2", "tx": 5, "ty": 6, "dir": "up" },
    { "x": 17, "y": 13, "to": "twinleaf_house2", "tx": 5, "ty": 6, "dir": "up" }
  ],
  "signs": [{ "x": 3, "y": 10, "text": "SANDGEM TOWN — Town of Sand! The Pokemon Lab studies species from all nine regions." }],
  "npcs": [
    { "id": "aide", "x": 10, "y": 8, "sprite": "scientist", "dir": "down", "move": "wander", "text": "Professor Rowan catalogues Pokemon from every region — Kanto to Paldea. The Pokedex can hold them all!" }
  ],
  "encounters": "sandgem_water",
  "triggers": []
});
