PKM.registerMap('twinleaf', {
  "name": "Twinleaf Town", "theme": "outdoor", "music": "town", "town": "twinleaf", "encounters": "twinleaf_pond",
  "tiles": [
    "##########..##########",
    "#....................#",
    "#..HHHH......HHHH....#",
    "#..HHHH......HHHH....#",
    "#..HDHH......HDHH....#",
    "#....................#",
    "#....*........*......#",
    "#..S.................#",
    "#...============.....#",
    "#....................#",
    "#..~~......HHHH......#",
    "#..~~~.....HHHH......#",
    "#..~~~.....HDHH......#",
    "#...~................#",
    "#....*..........*....#",
    "#....................#",
    "#..S.................#",
    "######################"
  ],
  "connections": { "up": { "to": "route201", "offset": 4 } },
  "warps": [
    { "x": 4, "y": 4, "to": "twinleaf_home_1f", "tx": 6, "ty": 7, "dir": "up" },
    { "x": 14, "y": 4, "to": "twinleaf_rival_home", "tx": 6, "ty": 7, "dir": "up" },
    { "x": 12, "y": 12, "to": "twinleaf_house2", "tx": 5, "ty": 6, "dir": "up" }
  ],
  "signs": [
    { "x": 3, "y": 7, "text": "{PLAYER}'s house" },
    { "x": 3, "y": 16, "text": "TWINLEAF TOWN — Fresh and Free!" }
  ],
  "npcs": [
    { "id": "kid", "x": 8, "y": 14, "sprite": "youngster", "dir": "down", "move": "wander", "text": "generic_kid" },
    { "id": "barry", "x": 14, "y": 5, "sprite": "rival", "dir": "down", "move": "static", "requires": "_barry_cutscene" }
  ],
  "triggers": [
    { "x": 9, "y": 1, "w": 4, "h": 1, "script": "rival_stop", "unless": "rival_stopped" }
  ]
});
