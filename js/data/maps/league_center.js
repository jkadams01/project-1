PKM.registerMap('league_center', {
 "name": "Pokemon League Pokemon Center",
 "theme": "center",
 "music": "center",
 "indoor": true,
 "tiles": [
  "################",
  "#.....##.......#",
  "#..............#",
  "#..............#",
  "#..............#",
  "#..............#",
  "#..............#",
  "#######D########"
 ],
 "healSpot": {
  "x": 7,
  "y": 3
 },
 "warps": [
  {
   "x": 7,
   "y": 7,
   "to": "league_front",
   "tx": 3,
   "ty": 5,
   "dir": "down"
  }
 ],
 "signs": [],
 "npcs": [
  {
   "id": "nurse",
   "x": 7,
   "y": 1,
   "sprite": "nurse",
   "dir": "down",
   "move": "static",
   "script": "nurse_heal"
  },
  {
   "id": "pc",
   "x": 13,
   "y": 1,
   "sprite": "scientist",
   "dir": "down",
   "move": "static",
   "script": "use_pc"
  },
  {
   "id": "lounger",
   "x": 3,
   "y": 4,
   "sprite": "lass",
   "dir": "down",
   "move": "wander",
   "text": "generic_hmless"
  }
 ]
});
