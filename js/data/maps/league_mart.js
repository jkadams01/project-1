PKM.registerMap('league_mart', {
 "name": "Pokemon League Poke Mart",
 "theme": "mart",
 "music": "center",
 "indoor": true,
 "tiles": [
  "##############",
  "#..##....##..#",
  "#............#",
  "#..##....##..#",
  "#............#",
  "#............#",
  "#............#",
  "#............#",
  "######D#######"
 ],
 "shop": [
  "great-ball",
  "ultra-ball",
  "quick-ball",
  "dusk-ball",
  "timer-ball",
  "net-ball",
  "super-potion",
  "hyper-potion",
  "max-potion",
  "full-restore",
  "full-heal",
  "revive",
  "max-repel",
  "escape-rope",
  "max-revive",
  "ether",
  "elixir"
 ],
 "warps": [
  {
   "x": 6,
   "y": 8,
   "to": "league_front",
   "tx": 15,
   "ty": 5,
   "dir": "down"
  }
 ],
 "signs": [],
 "npcs": [
  {
   "id": "clerk",
   "x": 2,
   "y": 6,
   "sprite": "clerk",
   "dir": "right",
   "move": "static",
   "script": "shop_here"
  }
 ]
});
