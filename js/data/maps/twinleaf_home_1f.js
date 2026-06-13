PKM.registerMap('twinleaf_home_1f', {
  "name": "Your House", "theme": "indoor", "music": "town", "indoor": true,
  "tiles": [
    "############",
    "#o..S....oD#",
    "#..........#",
    "#..........#",
    "#..........#",
    "#..........#",
    "#..........#",
    "#..........#",
    "######D#####"
  ],
  "warps": [
    { "x": 10, "y": 1, "to": "twinleaf_home_2f", "tx": 6, "ty": 5, "dir": "left" },
    { "x": 6, "y": 8, "to": "twinleaf", "tx": 4, "ty": 5, "dir": "down" }
  ],
  "signs": [{ "x": 4, "y": 1, "text": "The family planner: 'Dream big. Pack light. Call your mother.'" }],
  "npcs": [
    { "id": "mom", "x": 3, "y": 4, "sprite": "mom", "dir": "down", "move": "static", "script": "mom_chat" }
  ]
});
