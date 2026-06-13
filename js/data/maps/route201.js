PKM.registerMap('route201', {
  "name": "Route 201", "theme": "outdoor", "music": "route", "encounters": "route201",
  "tiles": [
    "####################################",
    "#,,,,..#######......#######....,,,,#",
    "#,,,,..#######,,,,..#######....,,,,#",
    "#......#######,,,,..#######........#",
    "#..................................#",
    "#..S..,,,,,..............,,,,,....S#",
    "......========================......",
    "......========================......",
    "#....,,,,,,........,,,,,,...........",
    "#..................................#",
    "#,,,,......^^^^^^^^......,,,,......#",
    "#..................................#",
    "#.............==...................#",
    "##############..####################"
  ],
  "connections": {
    "left": { "to": "verity_lakefront", "offset": 0 },
    "right": { "to": "sandgem", "offset": 0 },
    "down": { "to": "twinleaf", "offset": -4 }
  },
  "signs": [
    { "x": 3, "y": 5, "text": "ROUTE 201 — West: Lake Verity. East: Sandgem Town." },
    { "x": 34, "y": 5, "text": "SANDGEM TOWN ahead — home of the Pokemon Research Lab." }
  ],
  "items": [{ "x": 8, "y": 9, "item": "potion", "n": 1 }],
  "npcs": [
    { "id": "walker", "x": 22, "y": 9, "sprite": "youngster", "dir": "left", "move": "wander", "text": "Tall grass means wild Pokemon. Don't step in without a partner of your own!" }
  ],
  "triggers": []
});
